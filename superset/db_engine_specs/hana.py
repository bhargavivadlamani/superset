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
from datetime import datetime
from typing import Optional

from superset.db_engine_specs.base import LimitMethod
from superset.db_engine_specs.postgres import PostgresBaseEngineSpec


class HanaEngineSpec(PostgresBaseEngineSpec):
    engine = "hana"
    limit_method = LimitMethod.WRAP_SQL
    force_column_alias_quotes = True
    max_column_name_length = 30

    _time_grain_functions = {
        None: "{col}",
        "PT1S": "TO_TIMESTAMP(SUBSTRING(TO_TIMESTAMP({col}),0,20))",
        "PT1M": "TO_TIMESTAMP(SUBSTRING(TO_TIMESTAMP({col}),0,17) || '00')",
        "PT1H": "TO_TIMESTAMP(SUBSTRING(TO_TIMESTAMP({col}),0,14) || '00:00')",
        "P1D": "TO_DATE({col})",
        "P1M": "TO_DATE(SUBSTRING(TO_DATE({col}),0,7)||'-01')",
        "P0.25Y": "TO_DATE(SUBSTRING( \
                   TO_DATE({col}), 0, 5)|| LPAD(CAST((CAST(SUBSTRING(QUARTER( \
                   TO_DATE({col}), 1), 7, 1) as int)-1)*3 +1 as text),2,'0') ||'-01')",
        "P1Y": "TO_DATE(YEAR({col})||'-01-01')",
    }

    @classmethod
    def convert_dttm(cls, target_type: str, dttm: datetime) -> Optional[str]:
        """
        Tested: hana time returns DATETIME and STRING
        HANA:
        :return dttm->DATETIME
        HANA->DATE:f"TO_DATE('{dttm.date().isoformat()}', 'YYYY-MM-DD')"

        :return dttm->DATETIME
        HANA->TIMESTAMP:
        f"TO_TIMESTAMP('{dttm.isoformat(timespec="microseconds")}',
        'YYYY-MM-DD"T"HH24:MI:SS.ff6')"

        :return dttm->STRING
        HANA->NVARCHAR TYPE:f"TO_CHAR('{dttm.date().isoformat()}', 'YYYYMMDD')"
        """
        tt = target_type.upper()
        if tt == "DATETIME":
            return f"""TO_TIMESTAMP('{dttm.isoformat(timespec="microseconds")}', \
             'YYYY-MM-DD"T"HH24:MI:SS.ff6')"""  # pylint: disable=line-too-long
        """
        If you store nvchar for oracle time in your hana model 
        and you need to be able to filter time in superset, 
        just uncomment the following or convert time by expression
        
        If your primary temporal column is in string format, 
        you can create an expression that parses the string-based
        date/datetime/timestamp 
        into a native date/datetime/timestamp value.
        Just select the table, click columns, add a new column,
        write the expression in the "expression" field 
        and make sure to define the target type as "DATETIME" 
        with a checkmark on the "Is temporal" field. 
        After this you should be able to use that
        expression as your temporal column.
        """
        # if tt == "STRING":
        #     return f"TO_CHAR('{dttm.date().isoformat()}', 'YYYYMMDD')"
        return None
