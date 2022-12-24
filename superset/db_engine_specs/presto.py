# Licensed to the Apache Software Foundation (ASF) under one
# or more contributor license agreements.  See the NOTICE file
# distributed with this work for additional information
# regarding copyright ownership.  The ASF licenses this file
# to you under the Apache License, Version 2.0 (the
# "License"); you may not use this file except in compliance
# with the License.  You may obtain a copy of the License at
#
#   http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing,
# software distributed under the License is distributed on an
# "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
# KIND, either express or implied.  See the License for the
# specific language governing permissions and limitations
# under the License.
# pylint: disable=too-many-lines
from __future__ import annotations

import logging
import re
import time
from abc import ABCMeta
from collections import defaultdict, deque
from datetime import datetime
from distutils.version import StrictVersion
from textwrap import dedent
from typing import (
    Any,
    cast,
    Dict,
    List,
    Optional,
    Pattern,
    Set,
    Tuple,
    TYPE_CHECKING,
    Union,
)
from urllib import parse

import pandas as pd
import simplejson as json
from flask import current_app
from flask_babel import gettext as __, lazy_gettext as _
from sqlalchemy import Column, literal_column, types
from sqlalchemy.engine.base import Engine
from sqlalchemy.engine.reflection import Inspector
from sqlalchemy.engine.result import Row as ResultRow
from sqlalchemy.engine.url import URL
from sqlalchemy.orm import Session
from sqlalchemy.sql.expression import ColumnClause, Select

from superset import cache_manager, is_feature_enabled
from superset.common.db_query_status import QueryStatus
from superset.databases.utils import make_url_safe
from superset.db_engine_specs.base import BaseEngineSpec, ColumnTypeMapping
from superset.errors import SupersetErrorType
from superset.exceptions import SupersetTemplateException
from superset.models.sql_lab import Query
from superset.models.sql_types.presto_sql_types import (
    Array,
    Date,
    Interval,
    Map,
    Row,
    TimeStamp,
    TinyInteger,
)
from superset.result_set import destringify
from superset.superset_typing import ResultSetColumnType
from superset.utils import core as utils
from superset.utils.core import ColumnSpec, GenericDataType

if TYPE_CHECKING:
    # prevent circular imports
    from superset.models.core import Database

    # need try/catch because pyhive may not be installed
    try:
        from pyhive.presto import Cursor  # pylint: disable=unused-import
    except ImportError:
        pass

COLUMN_DOES_NOT_EXIST_REGEX = re.compile(
    "line (?P<location>.+?): .*Column '(?P<column_name>.+?)' cannot be resolved"
)
TABLE_DOES_NOT_EXIST_REGEX = re.compile(".*Table (?P<table_name>.+?) does not exist")
SCHEMA_DOES_NOT_EXIST_REGEX = re.compile(
    "line (?P<location>.+?): .*Schema '(?P<schema_name>.+?)' does not exist"
)
CONNECTION_ACCESS_DENIED_REGEX = re.compile("Access Denied: Invalid credentials")
CONNECTION_INVALID_HOSTNAME_REGEX = re.compile(
    r"Failed to establish a new connection: \[Errno 8\] nodename nor servname "
    "provided, or not known"
)
CONNECTION_HOST_DOWN_REGEX = re.compile(
    r"Failed to establish a new connection: \[Errno 60\] Operation timed out"
)
CONNECTION_PORT_CLOSED_REGEX = re.compile(
    r"Failed to establish a new connection: \[Errno 61\] Connection refused"
)
CONNECTION_UNKNOWN_DATABASE_ERROR = re.compile(
    r"line (?P<location>.+?): Catalog '(?P<catalog_name>.+?)' does not exist"
)

logger = logging.getLogger(__name__)


def get_children(column: ResultSetColumnType) -> List[ResultSetColumnType]:
    """
    Get the children of a complex Presto type (row or array).

    For arrays, we return a single list with the base type:

        >>> get_children(dict(name="a", type="ARRAY(BIGINT)", is_dttm=False))
        [{"name": "a", "type": "BIGINT", "is_dttm": False}]

    For rows, we return a list of the columns:

        >>> get_children(dict(name="a", type="ROW(BIGINT,FOO VARCHAR)",  is_dttm=False))
        [{'name': 'a._col0', 'type': 'BIGINT', 'is_dttm': False}, {'name': 'a.foo', 'type': 'VARCHAR', 'is_dttm': False}]  # pylint: disable=line-too-long

    :param column: dictionary representing a Presto column
    :return: list of dictionaries representing children columns
    """
    pattern = re.compile(r"(?P<type>\w+)\((?P<children>.*)\)")
    if not column["type"]:
        raise ValueError
    match = pattern.match(column["type"])
    if not match:
        raise Exception(f"Unable to parse column type {column['type']}")

    group = match.groupdict()
    type_ = group["type"].upper()
    children_type = group["children"]
    if type_ == "ARRAY":
        return [{"name": column["name"], "type": children_type, "is_dttm": False}]

    if type_ == "ROW":
        nameless_columns = 0
        columns = []
        for child in utils.split(children_type, ","):
            parts = list(utils.split(child.strip(), " "))
            if len(parts) == 2:
                name, type_ = parts
                name = name.strip('"')
            else:
                name = f"_col{nameless_columns}"
                type_ = parts[0]
                nameless_columns += 1
            _column: ResultSetColumnType = {
                "name": f"{column['name']}.{name.lower()}",
                "type": type_,
                "is_dttm": False,
            }
            columns.append(_column)
        return columns

    raise Exception(f"Unknown type {type_}!")


class PrestoBaseEngineSpec(BaseEngineSpec, metaclass=ABCMeta):
    """
    A base class that share common functions between Presto and Trino
    """

    column_type_mappings = (
        (
            re.compile(r"^boolean.*", re.IGNORECASE),
            types.BOOLEAN(),
            GenericDataType.BOOLEAN,
        ),
        (
            re.compile(r"^tinyint.*", re.IGNORECASE),
            TinyInteger(),
            GenericDataType.NUMERIC,
        ),
        (
            re.compile(r"^smallint.*", re.IGNORECASE),
            types.SmallInteger(),
            GenericDataType.NUMERIC,
        ),
        (
            re.compile(r"^integer.*", re.IGNORECASE),
            types.INTEGER(),
            GenericDataType.NUMERIC,
        ),
        (
            re.compile(r"^bigint.*", re.IGNORECASE),
            types.BigInteger(),
            GenericDataType.NUMERIC,
        ),
        (
            re.compile(r"^real.*", re.IGNORECASE),
            types.FLOAT(),
            GenericDataType.NUMERIC,
        ),
        (
            re.compile(r"^double.*", re.IGNORECASE),
            types.FLOAT(),
            GenericDataType.NUMERIC,
        ),
        (
            re.compile(r"^decimal.*", re.IGNORECASE),
            types.DECIMAL(),
            GenericDataType.NUMERIC,
        ),
        (
            re.compile(r"^varchar(\((\d+)\))*$", re.IGNORECASE),
            lambda match: types.VARCHAR(int(match[2])) if match[2] else types.String(),
            GenericDataType.STRING,
        ),
        (
            re.compile(r"^char(\((\d+)\))*$", re.IGNORECASE),
            lambda match: types.CHAR(int(match[2])) if match[2] else types.String(),
            GenericDataType.STRING,
        ),
        (
            re.compile(r"^varbinary.*", re.IGNORECASE),
            types.VARBINARY(),
            GenericDataType.STRING,
        ),
        (
            re.compile(r"^json.*", re.IGNORECASE),
            types.JSON(),
            GenericDataType.STRING,
        ),
        (
            re.compile(r"^date.*", re.IGNORECASE),
            types.Date(),
            GenericDataType.TEMPORAL,
        ),
        (
            re.compile(r"^timestamp.*", re.IGNORECASE),
            types.TIMESTAMP(),
            GenericDataType.TEMPORAL,
        ),
        (
            re.compile(r"^interval.*", re.IGNORECASE),
            Interval(),
            GenericDataType.TEMPORAL,
        ),
        (
            re.compile(r"^time.*", re.IGNORECASE),
            types.Time(),
            GenericDataType.TEMPORAL,
        ),
        (re.compile(r"^array.*", re.IGNORECASE), Array(), GenericDataType.STRING),
        (re.compile(r"^map.*", re.IGNORECASE), Map(), GenericDataType.STRING),
        (re.compile(r"^row.*", re.IGNORECASE), Row(), GenericDataType.STRING),
    )

    # pylint: disable=line-too-long
    _time_grain_expressions = {
        None: "{col}",
        "PT1S": "date_trunc('second', CAST({col} AS TIMESTAMP))",
        "PT1M": "date_trunc('minute', CAST({col} AS TIMESTAMP))",
        "PT1H": "date_trunc('hour', CAST({col} AS TIMESTAMP))",
        "P1D": "date_trunc('day', CAST({col} AS TIMESTAMP))",
        "P1W": "date_trunc('week', CAST({col} AS TIMESTAMP))",
        "P1M": "date_trunc('month', CAST({col} AS TIMESTAMP))",
        "P3M": "date_trunc('quarter', CAST({col} AS TIMESTAMP))",
        "P1Y": "date_trunc('year', CAST({col} AS TIMESTAMP))",
        # Week starting Sunday
        "1969-12-28T00:00:00Z/P1W": "date_trunc('week', CAST({col} AS TIMESTAMP) + interval '1' day) - interval '1' day",  # noqa
        # Week starting Monday
        "1969-12-29T00:00:00Z/P1W": "date_trunc('week', CAST({col} AS TIMESTAMP))",
        # Week ending Saturday
        "P1W/1970-01-03T00:00:00Z": "date_trunc('week', CAST({col} AS TIMESTAMP) + interval '1' day) + interval '5' day",  # noqa
        # Week ending Sunday
        "P1W/1970-01-04T00:00:00Z": "date_trunc('week', CAST({col} AS TIMESTAMP)) + interval '6' day",  # noqa
    }

    @classmethod
    def convert_dttm(
        cls, target_type: str, dttm: datetime, db_extra: Optional[Dict[str, Any]] = None
    ) -> Optional[str]:
        """
        Convert a Python `datetime` object to a SQL expression.
        :param target_type: The target type of expression
        :param dttm: The datetime object
        :param db_extra: The database extra object
        :return: The SQL expression
        Superset only defines time zone naive `datetime` objects, though this method
        handles both time zone naive and aware conversions.
        """
        if not (column_spec := cls.get_column_spec(target_type)):
            return None

        sqla_type, _, _, _ = column_spec
        if isinstance(sqla_type, types.Date):
            return f"DATE '{dttm.date().isoformat()}'"
        if isinstance(sqla_type, types.TIMESTAMP):
            return f"""TIMESTAMP '{dttm.isoformat(timespec="microseconds", sep=" ")}'"""
        raise Exception(column_spec)
        return None

    @classmethod
    def epoch_to_dttm(cls) -> str:
        return "from_unixtime({col})"

    @classmethod
    def adjust_database_uri(
        cls, uri: URL, selected_schema: Optional[str] = None
    ) -> URL:
        database = uri.database
        if selected_schema and database:
            selected_schema = parse.quote(selected_schema, safe="")
            if "/" in database:
                database = database.split("/")[0] + "/" + selected_schema
            else:
                database += "/" + selected_schema
            uri = uri.set(database=database)

        return uri

    @classmethod
    def estimate_statement_cost(cls, statement: str, cursor: Any) -> Dict[str, Any]:
        """
        Run a SQL query that estimates the cost of a given statement.
        :param statement: A single SQL statement
        :param cursor: Cursor instance
        :return: JSON response from Trino
        """
        sql = f"EXPLAIN (TYPE IO, FORMAT JSON) {statement}"
        cursor.execute(sql)

        # the output from Trino is a single column and a single row containing
        # JSON:
        #
        #   {
        #     ...
        #     "estimate" : {
        #       "outputRowCount" : 8.73265878E8,
        #       "outputSizeInBytes" : 3.41425774958E11,
        #       "cpuCost" : 3.41425774958E11,
        #       "maxMemory" : 0.0,
        #       "networkCost" : 3.41425774958E11
        #     }
        #   }
        result = json.loads(cursor.fetchone()[0])
        return result

    @classmethod
    def query_cost_formatter(
        cls, raw_cost: List[Dict[str, Any]]
    ) -> List[Dict[str, str]]:
        """
        Format cost estimate.
        :param raw_cost: JSON estimate from Trino
        :return: Human readable cost estimate
        """

        def humanize(value: Any, suffix: str) -> str:
            try:
                value = int(value)
            except ValueError:
                return str(value)

            prefixes = ["K", "M", "G", "T", "P", "E", "Z", "Y"]
            prefix = ""
            to_next_prefix = 1000
            while value > to_next_prefix and prefixes:
                prefix = prefixes.pop(0)
                value //= to_next_prefix

            return f"{value} {prefix}{suffix}"

        cost = []
        columns = [
            ("outputRowCount", "Output count", " rows"),
            ("outputSizeInBytes", "Output size", "B"),
            ("cpuCost", "CPU cost", ""),
            ("maxMemory", "Max memory", "B"),
            ("networkCost", "Network cost", ""),
        ]
        for row in raw_cost:
            estimate: Dict[str, float] = row.get("estimate", {})
            statement_cost = {}
            for key, label, suffix in columns:
                if key in estimate:
                    statement_cost[label] = humanize(estimate[key], suffix).strip()
            cost.append(statement_cost)

        return cost

    @classmethod
    @cache_manager.data_cache.memoize()
    def get_function_names(cls, database: Database) -> List[str]:
        """
        Get a list of function names that are able to be called on the database.
        Used for SQL Lab autocomplete.

        :param database: The database to get functions for
        :return: A list of function names useable in the database
        """
        return database.get_df("SHOW FUNCTIONS")["Function"].tolist()

    @classmethod
    def _partition_query(  # pylint: disable=too-many-arguments,too-many-locals
        cls,
        table_name: str,
        database: Database,
        limit: int = 0,
        order_by: Optional[List[Tuple[str, bool]]] = None,
        filters: Optional[Dict[Any, Any]] = None,
    ) -> str:
        """Returns a partition query

        :param table_name: the name of the table to get partitions from
        :type table_name: str
        :param limit: the number of partitions to be returned
        :type limit: int
        :param order_by: a list of tuples of field name and a boolean
            that determines if that field should be sorted in descending
            order
        :type order_by: list of (str, bool) tuples
        :param filters: dict of field name and filter value combinations
        """
        limit_clause = "LIMIT {}".format(limit) if limit else ""
        order_by_clause = ""
        if order_by:
            l = []
            for field, desc in order_by:
                l.append(field + " DESC" if desc else "")
            order_by_clause = "ORDER BY " + ", ".join(l)

        where_clause = ""
        if filters:
            l = []
            for field, value in filters.items():
                l.append(f"{field} = '{value}'")
            where_clause = "WHERE " + " AND ".join(l)

        presto_version = database.get_extra().get("version")

        # Partition select syntax changed in v0.199, so check here.
        # Default to the new syntax if version is unset.
        partition_select_clause = (
            f'SELECT * FROM "{table_name}$partitions"'
            if not presto_version
            or StrictVersion(presto_version) >= StrictVersion("0.199")
            else f"SHOW PARTITIONS FROM {table_name}"
        )

        sql = dedent(
            f"""\
            {partition_select_clause}
            {where_clause}
            {order_by_clause}
            {limit_clause}
        """
        )
        return sql

    @classmethod
    def where_latest_partition(  # pylint: disable=too-many-arguments
        cls,
        table_name: str,
        schema: Optional[str],
        database: Database,
        query: Select,
        columns: Optional[List[Dict[str, str]]] = None,
    ) -> Optional[Select]:
        try:
            col_names, values = cls.latest_partition(
                table_name, schema, database, show_first=True
            )
        except Exception:  # pylint: disable=broad-except
            # table is not partitioned
            return None

        if values is None:
            return None

        column_type_by_name = {
            column.get("name"): column.get("type") for column in columns or []
        }

        for col_name, value in zip(col_names, values):
            if col_name in column_type_by_name:
                if column_type_by_name.get(col_name) == "TIMESTAMP":
                    query = query.where(Column(col_name, TimeStamp()) == value)
                elif column_type_by_name.get(col_name) == "DATE":
                    query = query.where(Column(col_name, Date()) == value)
                else:
                    query = query.where(Column(col_name) == value)
        return query

    @classmethod
    def _latest_partition_from_df(cls, df: pd.DataFrame) -> Optional[List[str]]:
        if not df.empty:
            return df.to_records(index=False)[0].item()
        return None

    @classmethod
    @cache_manager.data_cache.memoize(timeout=60)
    def latest_partition(
        cls,
        table_name: str,
        schema: Optional[str],
        database: Database,
        show_first: bool = False,
    ) -> Tuple[List[str], Optional[List[str]]]:
        """Returns col name and the latest (max) partition value for a table

        :param table_name: the name of the table
        :param schema: schema / database / namespace
        :param database: database query will be run against
        :type database: models.Database
        :param show_first: displays the value for the first partitioning key
          if there are many partitioning keys
        :type show_first: bool

        >>> latest_partition('foo_table')
        (['ds'], ('2018-01-01',))
        """
        indexes = database.get_indexes(table_name, schema)
        if not indexes:
            raise SupersetTemplateException(
                f"Error getting partition for {schema}.{table_name}. "
                "Verify that this table has a partition."
            )

        if len(indexes[0]["column_names"]) < 1:
            raise SupersetTemplateException(
                "The table should have one partitioned field"
            )

        if not show_first and len(indexes[0]["column_names"]) > 1:
            raise SupersetTemplateException(
                "The table should have a single partitioned field "
                "to use this function. You may want to use "
                "`presto.latest_sub_partition`"
            )

        column_names = indexes[0]["column_names"]
        part_fields = [(column_name, True) for column_name in column_names]
        sql = cls._partition_query(table_name, database, 1, part_fields)
        df = database.get_df(sql, schema)
        return column_names, cls._latest_partition_from_df(df)

    @classmethod
    def latest_sub_partition(
        cls, table_name: str, schema: Optional[str], database: Database, **kwargs: Any
    ) -> Any:
        """Returns the latest (max) partition value for a table

        A filtering criteria should be passed for all fields that are
        partitioned except for the field to be returned. For example,
        if a table is partitioned by (``ds``, ``event_type`` and
        ``event_category``) and you want the latest ``ds``, you'll want
        to provide a filter as keyword arguments for both
        ``event_type`` and ``event_category`` as in
        ``latest_sub_partition('my_table',
            event_category='page', event_type='click')``

        :param table_name: the name of the table, can be just the table
            name or a fully qualified table name as ``schema_name.table_name``
        :type table_name: str
        :param schema: schema / database / namespace
        :type schema: str
        :param database: database query will be run against
        :type database: models.Database

        :param kwargs: keyword arguments define the filtering criteria
            on the partition list. There can be many of these.
        :type kwargs: str
        >>> latest_sub_partition('sub_partition_table', event_type='click')
        '2018-01-01'
        """
        indexes = database.get_indexes(table_name, schema)
        part_fields = indexes[0]["column_names"]
        for k in kwargs.keys():  # pylint: disable=consider-iterating-dictionary
            if k not in k in part_fields:  # pylint: disable=comparison-with-itself
                msg = f"Field [{k}] is not part of the portioning key"
                raise SupersetTemplateException(msg)
        if len(kwargs.keys()) != len(part_fields) - 1:
            msg = (
                "A filter needs to be specified for {} out of the " "{} fields."
            ).format(len(part_fields) - 1, len(part_fields))
            raise SupersetTemplateException(msg)

        for field in part_fields:
            if field not in kwargs.keys():
                field_to_return = field

        sql = cls._partition_query(
            table_name, database, 1, [(field_to_return, True)], kwargs
        )
        df = database.get_df(sql, schema)
        if df.empty:
            return ""
        return df.to_dict()[field_to_return][0]


class PrestoEngineSpec(PrestoBaseEngineSpec):
    engine = "presto"
    engine_name = "Presto"
    allows_alias_to_source_column = False

    custom_errors: Dict[Pattern[str], Tuple[str, SupersetErrorType, Dict[str, Any]]] = {
        COLUMN_DOES_NOT_EXIST_REGEX: (
            __(
                'We can\'t seem to resolve the column "%(column_name)s" at '
                "line %(location)s.",
            ),
            SupersetErrorType.COLUMN_DOES_NOT_EXIST_ERROR,
            {},
        ),
        TABLE_DOES_NOT_EXIST_REGEX: (
            __(
                'The table "%(table_name)s" does not exist. '
                "A valid table must be used to run this query.",
            ),
            SupersetErrorType.TABLE_DOES_NOT_EXIST_ERROR,
            {},
        ),
        SCHEMA_DOES_NOT_EXIST_REGEX: (
            __(
                'The schema "%(schema_name)s" does not exist. '
                "A valid schema must be used to run this query.",
            ),
            SupersetErrorType.SCHEMA_DOES_NOT_EXIST_ERROR,
            {},
        ),
        CONNECTION_ACCESS_DENIED_REGEX: (
            __('Either the username "%(username)s" or the password is incorrect.'),
            SupersetErrorType.CONNECTION_ACCESS_DENIED_ERROR,
            {},
        ),
        CONNECTION_INVALID_HOSTNAME_REGEX: (
            __('The hostname "%(hostname)s" cannot be resolved.'),
            SupersetErrorType.CONNECTION_INVALID_HOSTNAME_ERROR,
            {},
        ),
        CONNECTION_HOST_DOWN_REGEX: (
            __(
                'The host "%(hostname)s" might be down, and can\'t be '
                "reached on port %(port)s."
            ),
            SupersetErrorType.CONNECTION_HOST_DOWN_ERROR,
            {},
        ),
        CONNECTION_PORT_CLOSED_REGEX: (
            __('Port %(port)s on hostname "%(hostname)s" refused the connection.'),
            SupersetErrorType.CONNECTION_PORT_CLOSED_ERROR,
            {},
        ),
        CONNECTION_UNKNOWN_DATABASE_ERROR: (
            __('Unable to connect to catalog named "%(catalog_name)s".'),
            SupersetErrorType.CONNECTION_UNKNOWN_DATABASE_ERROR,
            {},
        ),
    }

    @classmethod
    def get_allow_cost_estimate(cls, extra: Dict[str, Any]) -> bool:
        version = extra.get("version")
        return version is not None and StrictVersion(version) >= StrictVersion("0.319")

    @classmethod
    def update_impersonation_config(
        cls,
        connect_args: Dict[str, Any],
        uri: str,
        username: Optional[str],
    ) -> None:
        """
        Update a configuration dictionary
        that can set the correct properties for impersonating users
        :param connect_args: config to be updated
        :param uri: URI string
        :param username: Effective username
        :return: None
        """
        url = make_url_safe(uri)
        backend_name = url.get_backend_name()

        # Must be Presto connection, enable impersonation, and set optional param
        # auth=LDAP|KERBEROS
        # Set principal_username=$effective_username
        if backend_name == "presto" and username is not None:
            connect_args["principal_username"] = username

    @classmethod
    def get_table_names(
        cls,
        database: Database,
        inspector: Inspector,
        schema: Optional[str],
    ) -> Set[str]:
        """
        Get all the real table names within the specified schema.

        Per the SQLAlchemy definition if the schema is omitted the database’s default
        schema is used, however some dialects infer the request as schema agnostic.

        Note that PyHive's Hive and Presto SQLAlchemy dialects do not adhere to the
        specification where the `get_table_names` method returns both real tables and
        views. Futhermore the dialects wrongfully infer the request as schema agnostic
        when the schema is omitted.

        :param database: The database to inspect
        :param inspector: The SQLAlchemy inspector
        :param schema: The schema to inspect
        :returns: The physical table names
        """

        return super().get_table_names(
            database, inspector, schema
        ) - cls.get_view_names(database, inspector, schema)

    @classmethod
    def get_view_names(
        cls,
        database: Database,
        inspector: Inspector,
        schema: Optional[str],
    ) -> Set[str]:
        """
        Get all the view names within the specified schema.

        Per the SQLAlchemy definition if the schema is omitted the database’s default
        schema is used, however some dialects infer the request as schema agnostic.

        Note that PyHive's Hive and Presto SQLAlchemy dialects do not implement the
        `get_view_names` method. To ensure consistency with the `get_table_names` method
        the request is deemed schema agnostic when the schema is omitted.

        :param database: The database to inspect
        :param inspector: The SQLAlchemy inspector
        :param schema: The schema to inspect
        :returns: The view names
        """

        if schema:
            sql = dedent(
                """
                SELECT table_name FROM information_schema.tables
                WHERE table_schema = %(schema)s
                AND table_type = 'VIEW'
                """
            ).strip()
            params = {"schema": schema}
        else:
            sql = dedent(
                """
                SELECT table_name FROM information_schema.tables
                WHERE table_type = 'VIEW'
                """
            ).strip()
            params = {}

        with database.get_raw_connection(schema=schema) as conn:
            cursor = conn.cursor()
            cursor.execute(sql, params)
            results = cursor.fetchall()
            return {row[0] for row in results}

    @classmethod
    def _create_column_info(
        cls, name: str, data_type: types.TypeEngine
    ) -> Dict[str, Any]:
        """
        Create column info object
        :param name: column name
        :param data_type: column data type
        :return: column info object
        """
        return {"name": name, "type": f"{data_type}"}

    @classmethod
    def _get_full_name(cls, names: List[Tuple[str, str]]) -> str:
        """
        Get the full column name
        :param names: list of all individual column names
        :return: full column name
        """
        return ".".join(column[0] for column in names if column[0])

    @classmethod
    def _has_nested_data_types(cls, component_type: str) -> bool:
        """
        Check if string contains a data type. We determine if there is a data type by
        whitespace or multiple data types by commas
        :param component_type: data type
        :return: boolean
        """
        comma_regex = r",(?=(?:[^\"]*\"[^\"]*\")*[^\"]*$)"
        white_space_regex = r"\s(?=(?:[^\"]*\"[^\"]*\")*[^\"]*$)"
        return (
            re.search(comma_regex, component_type) is not None
            or re.search(white_space_regex, component_type) is not None
        )

    @classmethod
    def _split_data_type(cls, data_type: str, delimiter: str) -> List[str]:
        """
        Split data type based on given delimiter. Do not split the string if the
        delimiter is enclosed in quotes
        :param data_type: data type
        :param delimiter: string separator (i.e. open parenthesis, closed parenthesis,
               comma, whitespace)
        :return: list of strings after breaking it by the delimiter
        """
        return re.split(
            r"{}(?=(?:[^\"]*\"[^\"]*\")*[^\"]*$)".format(delimiter), data_type
        )

    @classmethod
    def _parse_structural_column(  # pylint: disable=too-many-locals
        cls,
        parent_column_name: str,
        parent_data_type: str,
        result: List[Dict[str, Any]],
    ) -> None:
        """
        Parse a row or array column
        :param result: list tracking the results
        """
        formatted_parent_column_name = parent_column_name
        # Quote the column name if there is a space
        if " " in parent_column_name:
            formatted_parent_column_name = f'"{parent_column_name}"'
        full_data_type = f"{formatted_parent_column_name} {parent_data_type}"
        original_result_len = len(result)
        # split on open parenthesis ( to get the structural
        # data type and its component types
        data_types = cls._split_data_type(full_data_type, r"\(")
        stack: List[Tuple[str, str]] = []
        for data_type in data_types:
            # split on closed parenthesis ) to track which component
            # types belong to what structural data type
            inner_types = cls._split_data_type(data_type, r"\)")
            for inner_type in inner_types:
                # We have finished parsing multiple structural data types
                if not inner_type and stack:
                    stack.pop()
                elif cls._has_nested_data_types(inner_type):
                    # split on comma , to get individual data types
                    single_fields = cls._split_data_type(inner_type, ",")
                    for single_field in single_fields:
                        single_field = single_field.strip()
                        # If component type starts with a comma, the first single field
                        # will be an empty string. Disregard this empty string.
                        if not single_field:
                            continue
                        # split on whitespace to get field name and data type
                        field_info = cls._split_data_type(single_field, r"\s")
                        # check if there is a structural data type within
                        # overall structural data type
                        column_spec = cls.get_column_spec(field_info[1])
                        column_type = column_spec.sqla_type if column_spec else None
                        if column_type is None:
                            column_type = types.String()
                            logger.info(
                                "Did not recognize type %s of column %s",
                                field_info[1],
                                field_info[0],
                            )
                        if field_info[1] == "array" or field_info[1] == "row":
                            stack.append((field_info[0], field_info[1]))
                            full_parent_path = cls._get_full_name(stack)
                            result.append(
                                cls._create_column_info(full_parent_path, column_type)
                            )
                        else:  # otherwise this field is a basic data type
                            full_parent_path = cls._get_full_name(stack)
                            column_name = "{}.{}".format(
                                full_parent_path, field_info[0]
                            )
                            result.append(
                                cls._create_column_info(column_name, column_type)
                            )
                    # If the component type ends with a structural data type, do not pop
                    # the stack. We have run across a structural data type within the
                    # overall structural data type. Otherwise, we have completely parsed
                    # through the entire structural data type and can move on.
                    if not (inner_type.endswith("array") or inner_type.endswith("row")):
                        stack.pop()
                # We have an array of row objects (i.e. array(row(...)))
                elif inner_type in ("array", "row"):
                    # Push a dummy object to represent the structural data type
                    stack.append(("", inner_type))
                # We have an array of a basic data types(i.e. array(varchar)).
                elif stack:
                    # Because it is an array of a basic data type. We have finished
                    # parsing the structural data type and can move on.
                    stack.pop()
        # Unquote the column name if necessary
        if formatted_parent_column_name != parent_column_name:
            for index in range(original_result_len, len(result)):
                result[index]["name"] = result[index]["name"].replace(
                    formatted_parent_column_name, parent_column_name
                )

    @classmethod
    def _show_columns(
        cls, inspector: Inspector, table_name: str, schema: Optional[str]
    ) -> List[ResultRow]:
        """
        Show presto column names
        :param inspector: object that performs database schema inspection
        :param table_name: table name
        :param schema: schema name
        :return: list of column objects
        """
        quote = inspector.engine.dialect.identifier_preparer.quote_identifier
        full_table = quote(table_name)
        if schema:
            full_table = "{}.{}".format(quote(schema), full_table)
        return inspector.bind.execute(f"SHOW COLUMNS FROM {full_table}").fetchall()

    @classmethod
    def get_columns(
        cls, inspector: Inspector, table_name: str, schema: Optional[str]
    ) -> List[Dict[str, Any]]:
        """
        Get columns from a Presto data source. This includes handling row and
        array data types
        :param inspector: object that performs database schema inspection
        :param table_name: table name
        :param schema: schema name
        :return: a list of results that contain column info
                (i.e. column name and data type)
        """
        columns = cls._show_columns(inspector, table_name, schema)
        result: List[Dict[str, Any]] = []
        for column in columns:
            # parse column if it is a row or array
            if is_feature_enabled("PRESTO_EXPAND_DATA") and (
                "array" in column.Type or "row" in column.Type
            ):
                structural_column_index = len(result)
                cls._parse_structural_column(column.Column, column.Type, result)
                result[structural_column_index]["nullable"] = getattr(
                    column, "Null", True
                )
                result[structural_column_index]["default"] = None
                continue

            # otherwise column is a basic data type
            column_spec = cls.get_column_spec(column.Type)
            column_type = column_spec.sqla_type if column_spec else None
            if column_type is None:
                column_type = types.String()
                logger.info(
                    "Did not recognize type %s of column %s",
                    str(column.Type),
                    str(column.Column),
                )
            column_info = cls._create_column_info(column.Column, column_type)
            column_info["nullable"] = getattr(column, "Null", True)
            column_info["default"] = None
            result.append(column_info)
        return result

    @classmethod
    def _is_column_name_quoted(cls, column_name: str) -> bool:
        """
        Check if column name is in quotes
        :param column_name: column name
        :return: boolean
        """
        return column_name.startswith('"') and column_name.endswith('"')

    @classmethod
    def _get_fields(cls, cols: List[Dict[str, Any]]) -> List[ColumnClause]:
        """
        Format column clauses where names are in quotes and labels are specified
        :param cols: columns
        :return: column clauses
        """
        column_clauses = []
        # Column names are separated by periods. This regex will find periods in a
        # string if they are not enclosed in quotes because if a period is enclosed in
        # quotes, then that period is part of a column name.
        dot_pattern = r"""\.                # split on period
                          (?=               # look ahead
                          (?:               # create non-capture group
                          [^\"]*\"[^\"]*\"  # two quotes
                          )*[^\"]*$)        # end regex"""
        dot_regex = re.compile(dot_pattern, re.VERBOSE)
        for col in cols:
            # get individual column names
            col_names = re.split(dot_regex, col["name"])
            # quote each column name if it is not already quoted
            for index, col_name in enumerate(col_names):
                if not cls._is_column_name_quoted(col_name):
                    col_names[index] = '"{}"'.format(col_name)
            quoted_col_name = ".".join(
                col_name if cls._is_column_name_quoted(col_name) else f'"{col_name}"'
                for col_name in col_names
            )
            # create column clause in the format "name"."name" AS "name.name"
            column_clause = literal_column(quoted_col_name).label(col["name"])
            column_clauses.append(column_clause)
        return column_clauses

    @classmethod
    def select_star(  # pylint: disable=too-many-arguments
        cls,
        database: Database,
        table_name: str,
        engine: Engine,
        schema: Optional[str] = None,
        limit: int = 100,
        show_cols: bool = False,
        indent: bool = True,
        latest_partition: bool = True,
        cols: Optional[List[Dict[str, Any]]] = None,
    ) -> str:
        """
        Include selecting properties of row objects. We cannot easily break arrays into
        rows, so render the whole array in its own row and skip columns that correspond
        to an array's contents.
        """
        cols = cols or []
        presto_cols = cols
        if is_feature_enabled("PRESTO_EXPAND_DATA") and show_cols:
            dot_regex = r"\.(?=(?:[^\"]*\"[^\"]*\")*[^\"]*$)"
            presto_cols = [
                col for col in presto_cols if not re.search(dot_regex, col["name"])
            ]
        return super().select_star(
            database,
            table_name,
            engine,
            schema,
            limit,
            show_cols,
            indent,
            latest_partition,
            presto_cols,
        )

    @classmethod
    def expand_data(  # pylint: disable=too-many-locals
        cls, columns: List[ResultSetColumnType], data: List[Dict[Any, Any]]
    ) -> Tuple[
        List[ResultSetColumnType], List[Dict[Any, Any]], List[ResultSetColumnType]
    ]:
        """
        We do not immediately display rows and arrays clearly in the data grid. This
        method separates out nested fields and data values to help clearly display
        structural columns.

        Example: ColumnA is a row(nested_obj varchar) and ColumnB is an array(int)
        Original data set = [
            {'ColumnA': ['a1'], 'ColumnB': [1, 2]},
            {'ColumnA': ['a2'], 'ColumnB': [3, 4]},
        ]
        Expanded data set = [
            {'ColumnA': ['a1'], 'ColumnA.nested_obj': 'a1', 'ColumnB': 1},
            {'ColumnA': '',     'ColumnA.nested_obj': '',   'ColumnB': 2},
            {'ColumnA': ['a2'], 'ColumnA.nested_obj': 'a2', 'ColumnB': 3},
            {'ColumnA': '',     'ColumnA.nested_obj': '',   'ColumnB': 4},
        ]
        :param columns: columns selected in the query
        :param data: original data set
        :return: list of all columns(selected columns and their nested fields),
                 expanded data set, listed of nested fields
        """
        if not is_feature_enabled("PRESTO_EXPAND_DATA"):
            return columns, data, []

        # process each column, unnesting ARRAY types and
        # expanding ROW types into new columns
        to_process = deque((column, 0) for column in columns)
        all_columns: List[ResultSetColumnType] = []
        expanded_columns = []
        current_array_level = None
        while to_process:
            column, level = to_process.popleft()
            if column["name"] not in [column["name"] for column in all_columns]:
                all_columns.append(column)

            # When unnesting arrays we need to keep track of how many extra rows
            # were added, for each original row. This is necessary when we expand
            # multiple arrays, so that the arrays after the first reuse the rows
            # added by the first. every time we change a level in the nested arrays
            # we reinitialize this.
            if level != current_array_level:
                unnested_rows: Dict[int, int] = defaultdict(int)
                current_array_level = level

            name = column["name"]
            values: Optional[Union[str, List[Any]]]

            if column["type"] and column["type"].startswith("ARRAY("):
                # keep processing array children; we append to the right so that
                # multiple nested arrays are processed breadth-first
                to_process.append((get_children(column)[0], level + 1))

                # unnest array objects data into new rows
                i = 0
                while i < len(data):
                    row = data[i]
                    values = row.get(name)
                    if isinstance(values, str):
                        row[name] = values = destringify(values)
                    if values:
                        # how many extra rows we need to unnest the data?
                        extra_rows = len(values) - 1

                        # how many rows were already added for this row?
                        current_unnested_rows = unnested_rows[i]

                        # add any necessary rows
                        missing = extra_rows - current_unnested_rows
                        for _ in range(missing):
                            data.insert(i + current_unnested_rows + 1, {})
                            unnested_rows[i] += 1

                        # unnest array into rows
                        for j, value in enumerate(values):
                            data[i + j][name] = value

                        # skip newly unnested rows
                        i += unnested_rows[i]

                    i += 1

            if column["type"] and column["type"].startswith("ROW("):
                # expand columns; we append them to the left so they are added
                # immediately after the parent
                expanded = get_children(column)
                to_process.extendleft((column, level) for column in expanded[::-1])
                expanded_columns.extend(expanded)

                # expand row objects into new columns
                for row in data:
                    values = row.get(name) or []
                    if isinstance(values, str):
                        values = cast(Optional[List[Any]], destringify(values))
                        row[name] = values
                    for value, col in zip(values or [], expanded):
                        row[col["name"]] = value

        data = [
            {k["name"]: row.get(k["name"], "") for k in all_columns} for row in data
        ]

        return all_columns, data, expanded_columns

    @classmethod
    def extra_table_metadata(
        cls, database: Database, table_name: str, schema_name: Optional[str]
    ) -> Dict[str, Any]:
        metadata = {}

        indexes = database.get_indexes(table_name, schema_name)
        if indexes:
            col_names, latest_parts = cls.latest_partition(
                table_name, schema_name, database, show_first=True
            )

            if not latest_parts:
                latest_parts = tuple([None] * len(col_names))

            metadata["partitions"] = {
                "cols": sorted(indexes[0].get("column_names", [])),
                "latest": dict(zip(col_names, latest_parts)),
                "partitionQuery": cls._partition_query(
                    table_name=(
                        f"{schema_name}.{table_name}"
                        if schema_name and "." not in table_name
                        else table_name
                    ),
                    database=database,
                ),
            }

        # flake8 is not matching `Optional[str]` to `Any` for some reason...
        metadata["view"] = cast(
            Any, cls.get_create_view(database, schema_name, table_name)
        )

        return metadata

    @classmethod
    def get_create_view(
        cls, database: Database, schema: Optional[str], table: str
    ) -> Optional[str]:
        """
        Return a CREATE VIEW statement, or `None` if not a view.

        :param database: Database instance
        :param schema: Schema name
        :param table: Table (view) name
        """
        # pylint: disable=import-outside-toplevel
        from pyhive.exc import DatabaseError

        with database.get_raw_connection(schema=schema) as conn:
            cursor = conn.cursor()
            sql = f"SHOW CREATE VIEW {schema}.{table}"
            try:
                cls.execute(cursor, sql)
            except DatabaseError:  # not a VIEW
                return None
            rows = cls.fetch_data(cursor, 1)

            return rows[0][0]

    @classmethod
    def get_tracking_url(cls, cursor: "Cursor") -> Optional[str]:
        try:
            if cursor.last_query_id:
                # pylint: disable=protected-access, line-too-long
                return f"{cursor._protocol}://{cursor._host}:{cursor._port}/ui/query.html?{cursor.last_query_id}"
        except AttributeError:
            pass
        return None

    @classmethod
    def handle_cursor(cls, cursor: "Cursor", query: Query, session: Session) -> None:
        """Updates progress information"""
        tracking_url = cls.get_tracking_url(cursor)
        if tracking_url:
            query.tracking_url = tracking_url
            session.commit()

        query_id = query.id
        poll_interval = query.database.connect_args.get(
            "poll_interval", current_app.config["PRESTO_POLL_INTERVAL"]
        )
        logger.info("Query %i: Polling the cursor for progress", query_id)
        polled = cursor.poll()
        # poll returns dict -- JSON status information or ``None``
        # if the query is done
        # https://github.com/dropbox/PyHive/blob/
        # b34bdbf51378b3979eaf5eca9e956f06ddc36ca0/pyhive/presto.py#L178
        while polled:
            # Update the object and wait for the kill signal.
            stats = polled.get("stats", {})

            query = session.query(type(query)).filter_by(id=query_id).one()
            if query.status in [QueryStatus.STOPPED, QueryStatus.TIMED_OUT]:
                cursor.cancel()
                break

            if stats:
                state = stats.get("state")

                # if already finished, then stop polling
                if state == "FINISHED":
                    break

                completed_splits = float(stats.get("completedSplits"))
                total_splits = float(stats.get("totalSplits"))
                if total_splits and completed_splits:
                    progress = 100 * (completed_splits / total_splits)
                    logger.info(
                        "Query {} progress: {} / {} "  # pylint: disable=logging-format-interpolation
                        "splits".format(query_id, completed_splits, total_splits)
                    )
                    if progress > query.progress:
                        query.progress = progress
                    session.commit()
            time.sleep(poll_interval)
            logger.info("Query %i: Polling the cursor for progress", query_id)
            polled = cursor.poll()

    @classmethod
    def _extract_error_message(cls, ex: Exception) -> str:
        if (
            hasattr(ex, "orig")
            and type(ex.orig).__name__ == "DatabaseError"  # type: ignore
            and isinstance(ex.orig[0], dict)  # type: ignore
        ):
            error_dict = ex.orig[0]  # type: ignore
            return "{} at {}: {}".format(
                error_dict.get("errorName"),
                error_dict.get("errorLocation"),
                error_dict.get("message"),
            )
        if type(ex).__name__ == "DatabaseError" and hasattr(ex, "args") and ex.args:
            error_dict = ex.args[0]
            return error_dict.get("message", _("Unknown Presto Error"))
        return utils.error_msg_from_exception(ex)

    @classmethod
    def has_implicit_cancel(cls) -> bool:
        """
        Return True if the live cursor handles the implicit cancelation of the query,
        False otherwise.

        :return: Whether the live cursor implicitly cancels the query
        :see: handle_cursor
        """

        return True
