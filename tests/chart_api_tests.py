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
"""Unit tests for Superset"""
import json
from typing import List

import prison
from flask_appbuilder.security.sqla import models as ab_models

from superset import db, security_manager
from superset.connectors.connector_registry import ConnectorRegistry
from superset.models.slice import Slice

from .base_tests import SupersetTestCase


class ChartApiTests(SupersetTestCase):
    def __init__(self, *args, **kwargs):
        super(ChartApiTests, self).__init__(*args, **kwargs)

    def insert_chart(
        self,
        slice_name: str,
        owners: List[int],
        datasource_id: int,
        datasource_type: str = "table",
        description: str = "",
        viz_type: str = "",
        params: str = "",
        cache_timeout: int = 30,
    ) -> Slice:
        obj_owners = list()
        for owner in owners:
            user = db.session.query(security_manager.user_model).get(owner)
            obj_owners.append(user)
        datasource = ConnectorRegistry.get_datasource(
            datasource_type, datasource_id, db.session
        )
        slice = Slice(
            slice_name=slice_name,
            datasource_id=datasource.id,
            datasource_name=datasource.name,
            datasource_type=datasource.type,
            owners=obj_owners,
            description=description,
            viz_type=viz_type,
            params=params,
            cache_timeout=cache_timeout,
        )
        db.session.add(slice)
        db.session.commit()
        return slice

    def test_delete_chart(self):
        """
            Chart API: Test delete
        """
        admin_id = self.get_user("admin").id
        chart_id = self.insert_chart("name", [admin_id], 1).id
        self.login(username="admin")
        uri = f"api/v1/chart/{chart_id}"
        rv = self.client.delete(uri)
        self.assertEqual(rv.status_code, 200)
        model = db.session.query(Slice).get(chart_id)
        self.assertEqual(model, None)

    def test_delete_not_found_chart(self):
        """
            Chart API: Test not found delete
        """
        self.login(username="admin")
        chart_id = 1000
        uri = f"api/v1/chart/{chart_id}"
        rv = self.client.delete(uri)
        self.assertEqual(rv.status_code, 404)

    def test_delete_chart_admin_not_owned(self):
        """
            Chart API: Test admin delete not owned
        """
        gamma_id = self.get_user("gamma").id
        chart_id = self.insert_chart("title", [gamma_id], 1).id

        self.login(username="admin")
        uri = f"api/v1/chart/{chart_id}"
        rv = self.client.delete(uri)
        self.assertEqual(rv.status_code, 200)
        model = db.session.query(Slice).get(chart_id)
        self.assertEqual(model, None)

    def test_delete_chart_not_owned(self):
        """
            Chart API: Test delete try not owned
        """
        user_alpha1 = self.create_user(
            "alpha1", "password", "Alpha", email="alpha1@superset.org"
        )
        user_alpha2 = self.create_user(
            "alpha2", "password", "Alpha", email="alpha2@superset.org"
        )
        chart = self.insert_chart("title", [user_alpha1.id], 1)
        self.login(username="alpha2", password="password")
        uri = f"api/v1/chart/{chart.id}"
        rv = self.client.delete(uri)
        self.assertEqual(rv.status_code, 403)
        db.session.delete(chart)
        db.session.delete(user_alpha1)
        db.session.delete(user_alpha2)
        db.session.commit()

    def test_create_chart(self):
        """
            Chart API: Test create chart
        """
        admin_id = self.get_user("admin").id
        chart_data = {
            "slice_name": "name1",
            "description": "description1",
            "owners": [admin_id],
            "viz_type": "viz_type1",
            "params": "1234",
            "cache_timeout": 1000,
            "datasource_id": 1,
            "datasource_type": "table",
        }
        self.login(username="admin")
        uri = f"api/v1/chart/"
        rv = self.client.post(uri, json=chart_data)
        self.assertEqual(rv.status_code, 201)
        data = json.loads(rv.data.decode("utf-8"))
        model = db.session.query(Slice).get(data.get("id"))
        db.session.delete(model)
        db.session.commit()

    def test_create_simple_chart(self):
        """
            Chart API: Test create simple chart
        """
        chart_data = {
            "slice_name": "title1",
            "datasource_id": 1,
            "datasource_type": "table",
        }
        self.login(username="admin")
        uri = f"api/v1/chart/"
        rv = self.client.post(uri, json=chart_data)
        self.assertEqual(rv.status_code, 201)
        data = json.loads(rv.data.decode("utf-8"))
        model = db.session.query(Slice).get(data.get("id"))
        db.session.delete(model)
        db.session.commit()

    def test_create_chart_validate_owners(self):
        """
            Chart API: Test create validate owners
        """
        chart_data = {
            "slice_name": "title1",
            "datasource_id": 1,
            "datasource_type": "table",
            "owners": [1000],
        }
        self.login(username="admin")
        uri = f"api/v1/chart/"
        rv = self.client.post(uri, json=chart_data)
        self.assertEqual(rv.status_code, 422)
        response = json.loads(rv.data.decode("utf-8"))
        expected_response = {"message": {"owners": {"0": ["User 1000 does not exist"]}}}
        self.assertEqual(response, expected_response)

    def test_create_chart_validate_params(self):
        """
            Chart API: Test create validate json
        """
        chart_data = {
            "slice_name": "title1",
            "datasource_id": 1,
            "datasource_type": "table",
            "params": '{"A:"a"}',
        }
        self.login(username="admin")
        uri = f"api/v1/chart/"
        rv = self.client.post(uri, json=chart_data)
        self.assertEqual(rv.status_code, 422)

    def test_update_chart(self):
        """
            Chart API: Test update
        """
        admin = self.get_user("admin")
        gamma = self.get_user("gamma")

        chart_id = self.insert_chart("title", [admin.id], 1).id
        chart_data = {
            "slice_name": "title1_changed",
            "description": "description1",
            "owners": [gamma.id],
            "viz_type": "viz_type1",
            "params": "{'a': 1}",
            "cache_timeout": 1000,
            "datasource_id": 1,
            "datasource_type": "table",
        }
        self.login(username="admin")
        uri = f"api/v1/chart/{chart_id}"
        rv = self.client.put(uri, json=chart_data)
        self.assertEqual(rv.status_code, 200)
        model = db.session.query(Slice).get(chart_id)
        self.assertEqual(model.slice_name, "title1_changed")
        self.assertEqual(model.description, "description1")
        self.assertIn(admin, model.owners)
        self.assertIn(gamma, model.owners)
        self.assertEqual(model.viz_type, "viz_type1")
        self.assertEqual(model.params, "{'a': 1}")
        self.assertEqual(model.cache_timeout, 1000)
        self.assertEqual(model.datasource_id, 1)
        self.assertEqual(model.datasource_type, "table")
        self.assertEqual(model.datasource_name, "birth_names")
        db.session.delete(model)
        db.session.commit()

    def test_update_chart_new_owner(self):
        """
            Chart API: Test update set new owner to current user
        """
        gamma = self.get_user("gamma")
        admin = self.get_user("admin")
        chart_id = self.insert_chart("title", [gamma.id], 1).id
        chart_data = {"slice_name": "title1_changed"}
        self.login(username="admin")
        uri = f"api/v1/chart/{chart_id}"
        rv = self.client.put(uri, json=chart_data)
        self.assertEqual(rv.status_code, 200)
        model = db.session.query(Slice).get(chart_id)
        self.assertIn(admin, model.owners)
        db.session.delete(model)
        db.session.commit()

    def test_update_chart_not_owned(self):
        """
            Chart API: Test update not owned
        """
        user_alpha1 = self.create_user(
            "alpha1", "password", "Alpha", email="alpha1@superset.org"
        )
        user_alpha2 = self.create_user(
            "alpha2", "password", "Alpha", email="alpha2@superset.org"
        )
        chart = self.insert_chart("title", [user_alpha1.id], 1)

        self.login(username="alpha2", password="password")
        chart_data = {"slice_name": "title1_changed"}
        uri = f"api/v1/chart/{chart.id}"
        rv = self.client.put(uri, json=chart_data)
        self.assertEqual(rv.status_code, 403)
        db.session.delete(chart)
        db.session.delete(user_alpha1)
        db.session.delete(user_alpha2)
        db.session.commit()
