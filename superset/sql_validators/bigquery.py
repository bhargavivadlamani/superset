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

from __future__ import annotations

import re

from google.cloud import bigquery
from sqlalchemy.engine.base import Engine

from superset.models.core import Database
from superset.db_engine_specs.bigquery import BigQueryEngineSpec
from superset import db
from superset.sql_validators.base import BaseSQLValidator, SQLValidationAnnotation


class BigQueryValidator(BaseSQLValidator):  # pylint: disable=too-few-public-methods
    """Validate SQL queries using the pgsanity module"""

    name = "BigQueryValidator"

    @classmethod
    def validate(
        cls,
        sql: str,
        catalog: str | None,
        schema: str | None,
        database: Database,
    ) -> list[SQLValidationAnnotation]:
        # _database = db.session.query(Database).get(19)
        engine: Engine
        with database.get_sqla_engine() as engine:
            client = BigQueryEngineSpec._get_client(engine)
        annotations: list[SQLValidationAnnotation] = []

        job_config = bigquery.QueryJobConfig(dry_run=True, use_query_cache=False)
        try:
            dryrun_result = client.query(
                sql,
                job_config=job_config,
            )
        except Exception as e:
            match = re.match(r".*?Print=false: (.*?) at \[(\d+):(\d+)\]", f"{e}")
            line_number = int(match.group(2)) if match else 1
            message = f"{e}"
            #
            annotations.append(
                SQLValidationAnnotation(
                    message=message,
                    line_number=line_number,
                    start_column=None,
                    end_column=None,
                )
            )

            return annotations

        return annotations
