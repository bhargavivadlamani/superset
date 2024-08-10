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
"""Unit tests for async query celery jobs in Superset"""

from unittest import mock
from uuid import uuid4

import pytest
import redis
from celery.exceptions import SoftTimeLimitExceeded

from superset.async_events.cache_backend import (
    RedisCacheBackend,
    RedisSentinelCacheBackend,
)
from superset.commands.chart.data.get_data_command import ChartDataCommand
from superset.commands.chart.exceptions import ChartDataQueryFailedError
from superset.exceptions import SupersetException
from superset.extensions import async_query_manager, security_manager
from tests.integration_tests.base_tests import SupersetTestCase
from tests.integration_tests.fixtures.birth_names_dashboard import (
    load_birth_names_dashboard_with_slices,  # noqa: F401
    load_birth_names_data,  # noqa: F401
)
from tests.integration_tests.fixtures.query_context import get_query_context
from tests.integration_tests.fixtures.tags import (
    with_tagging_system_feature,  # noqa: F401
)
from tests.integration_tests.test_app import app

# Define the cache backends once
cache_backends = {
    "RedisCacheBackend": mock.Mock(spec=RedisCacheBackend),
    "RedisSentinelCacheBackend": mock.Mock(spec=RedisSentinelCacheBackend),
    "redis.Redis": mock.Mock(spec=redis.Redis),
}


class TestAsyncQueries(SupersetTestCase):
    @pytest.mark.usefixtures(
        "load_birth_names_data", "load_birth_names_dashboard_with_slices"
    )
    @mock.patch.object(async_query_manager, "update_job")
    @mock.patch("superset.tasks.async_queries.set_form_data")
    def test_load_chart_data_into_cache(self, mock_set_form_data, mock_update_job):
        from superset.tasks.async_queries import load_chart_data_into_cache

        app._got_first_request = False

        for cache_type, cache_backend in cache_backends.items():
            async_query_manager.get_cache_backend = mock.Mock(
                return_value=cache_backend
            )
            async_query_manager.init_app(app)

            query_context = get_query_context("birth_names")
            user = security_manager.find_user("gamma")
            job_metadata = {
                "channel_id": str(uuid4()),
                "job_id": str(uuid4()),
                "user_id": user.id,
                "status": "pending",
                "errors": [],
            }

            load_chart_data_into_cache(job_metadata, query_context)

            mock_set_form_data.assert_called_once_with(query_context)

            mock_update_job.assert_called_once_with(
                job_metadata, "done", result_url=mock.ANY
            )
            mock_set_form_data.reset_mock()
            mock_update_job.reset_mock()

    @mock.patch.object(
        ChartDataCommand, "run", side_effect=ChartDataQueryFailedError("Error: foo")
    )
    @mock.patch.object(async_query_manager, "update_job")
    def test_load_chart_data_into_cache_error(self, mock_update_job, mock_run_command):
        from superset.tasks.async_queries import load_chart_data_into_cache

        app._got_first_request = False

        for cache_type, cache_backend in cache_backends.items():
            async_query_manager.get_cache_backend = mock.Mock(
                return_value=cache_backend
            )
            async_query_manager.init_app(app)

            query_context = get_query_context("birth_names")
            user = security_manager.find_user("gamma")
            job_metadata = {
                "channel_id": str(uuid4()),
                "job_id": str(uuid4()),
                "user_id": user.id,
                "status": "pending",
                "errors": [],
            }
            with pytest.raises(ChartDataQueryFailedError):
                load_chart_data_into_cache(job_metadata, query_context)

            mock_run_command.assert_called_once_with(cache=True)
            errors = [{"message": "Error: foo"}]
            mock_update_job.assert_called_once_with(
                job_metadata, "error", errors=errors
            )
            mock_run_command.reset_mock()
            mock_update_job.reset_mock()

    @mock.patch.object(ChartDataCommand, "run")
    @mock.patch.object(async_query_manager, "update_job")
    def test_soft_timeout_load_chart_data_into_cache(
        self, mock_update_job, mock_run_command
    ):
        from superset.tasks.async_queries import load_chart_data_into_cache

        app._got_first_request = False

        for cache_type, cache_backend in cache_backends.items():
            async_query_manager.get_cache_backend = mock.Mock(
                return_value=cache_backend
            )
            async_query_manager.init_app(app)

            user = security_manager.find_user("gamma")
            form_data = {}
            job_metadata = {
                "channel_id": str(uuid4()),
                "job_id": str(uuid4()),
                "user_id": user.id,
                "status": "pending",
                "errors": [],
            }
            errors = ["A timeout occurred while loading chart data"]

            with pytest.raises(SoftTimeLimitExceeded):
                with mock.patch(
                    "superset.tasks.async_queries.set_form_data"
                ) as set_form_data:
                    set_form_data.side_effect = SoftTimeLimitExceeded()
                    load_chart_data_into_cache(job_metadata, form_data)
                set_form_data.assert_called_once_with(form_data, "error", errors=errors)

            mock_run_command.reset_mock()
            mock_update_job.reset_mock()

    @pytest.mark.usefixtures("load_birth_names_dashboard_with_slices")
    @mock.patch.object(async_query_manager, "update_job")
    def test_load_explore_json_into_cache(self, mock_update_job):
        from superset.tasks.async_queries import load_explore_json_into_cache

        app._got_first_request = False

        for cache_type, cache_backend in cache_backends.items():
            async_query_manager.get_cache_backend = mock.Mock(
                return_value=cache_backend
            )
            async_query_manager.init_app(app)

            table = self.get_table(name="birth_names")
            user = security_manager.find_user("gamma")
            form_data = {
                "datasource": f"{table.id}__table",
                "viz_type": "dist_bar",
                "granularity_sqla": "ds",
                "time_range": "No filter",
                "metrics": ["count"],
                "adhoc_filters": [],
                "groupby": ["gender"],
                "row_limit": 100,
            }
            job_metadata = {
                "channel_id": str(uuid4()),
                "job_id": str(uuid4()),
                "user_id": user.id,
                "status": "pending",
                "errors": [],
            }

            load_explore_json_into_cache(job_metadata, form_data)

            mock_update_job.assert_called_once_with(
                job_metadata, "done", result_url=mock.ANY
            )
            mock_update_job.reset_mock()

    @mock.patch.object(async_query_manager, "update_job")
    @mock.patch("superset.tasks.async_queries.set_form_data")
    def test_load_explore_json_into_cache_error(
        self, mock_set_form_data, mock_update_job
    ):
        from superset.tasks.async_queries import load_explore_json_into_cache

        app._got_first_request = False

        for cache_type, cache_backend in cache_backends.items():
            async_query_manager.get_cache_backend = mock.Mock(
                return_value=cache_backend
            )
            async_query_manager.init_app(app)

            user = security_manager.find_user("gamma")
            form_data = {}
            job_metadata = {
                "channel_id": str(uuid4()),
                "job_id": str(uuid4()),
                "user_id": user.id,
                "status": "pending",
                "errors": [],
            }

            with pytest.raises(SupersetException):
                load_explore_json_into_cache(job_metadata, form_data)

            mock_set_form_data.assert_called_once_with(form_data)
            errors = ["The dataset associated with this chart no longer exists"]
            mock_update_job.assert_called_once_with(
                job_metadata, "error", errors=errors
            )
            mock_set_form_data.reset_mock()
            mock_update_job.reset_mock()

    @mock.patch.object(ChartDataCommand, "run")
    @mock.patch.object(async_query_manager, "update_job")
    def test_soft_timeout_load_explore_json_into_cache(
        self, mock_update_job, mock_run_command
    ):
        from superset.tasks.async_queries import load_explore_json_into_cache

        app._got_first_request = False

        for cache_type, cache_backend in cache_backends.items():
            async_query_manager.get_cache_backend = mock.Mock(
                return_value=cache_backend
            )
            async_query_manager.init_app(app)

            user = security_manager.find_user("gamma")
            form_data = {}
            job_metadata = {
                "channel_id": str(uuid4()),
                "job_id": str(uuid4()),
                "user_id": user.id,
                "status": "pending",
                "errors": [],
            }
            errors = ["A timeout occurred while loading explore json, error"]

            with pytest.raises(SoftTimeLimitExceeded):
                with mock.patch(
                    "superset.tasks.async_queries.set_form_data"
                ) as set_form_data:
                    set_form_data.side_effect = SoftTimeLimitExceeded()
                    load_explore_json_into_cache(job_metadata, form_data)
                set_form_data.assert_called_once_with(form_data, "error", errors=errors)

            mock_run_command.reset_mock()
            mock_update_job.reset_mock()
