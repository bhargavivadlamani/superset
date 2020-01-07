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
import json
import re

from flask import current_app, g
from flask_appbuilder.models.sqla.interface import SQLAInterface
from marshmallow import fields, post_load, pre_load, Schema, ValidationError
from marshmallow.validate import Length

from superset import appbuilder
from superset.exceptions import SupersetException
from superset.models.dashboard import Dashboard
from superset.utils import core as utils
from superset.views.base import BaseOwnedModelRestApi, BaseOwnedSchema, validate_owner

from .mixin import DashboardMixin


class DashboardJSONMetadataSchema(Schema):
    timed_refresh_immune_slices = fields.List(fields.Integer())
    filter_scopes = fields.Dict()
    expanded_slices = fields.Dict()
    refresh_frequency = fields.Integer()
    default_filters = fields.Str()
    filter_immune_slice_fields = fields.Dict()
    stagger_refresh = fields.Boolean()
    stagger_time = fields.Integer()


def validate_json(value):
    try:
        utils.validate_json(value)
    except SupersetException:
        raise ValidationError("JSON not valid")


def validate_json_metadata(value):
    if not value:
        return
    try:
        value_obj = json.loads(value)
    except json.decoder.JSONDecodeError:
        raise ValidationError("JSON not valid")
    errors = DashboardJSONMetadataSchema(strict=True).validate(value_obj, partial=False)
    if errors:
        raise ValidationError(errors)


def validate_slug_uniqueness(value):
    # slug is not required but must be unique
    if value:
        item = (
            current_app.appbuilder.get_session.query(Dashboard.id)
            .filter_by(slug=value)
            .one_or_none()
        )
        if item:
            raise ValidationError("Must be unique")


class BaseDashboardSchema(BaseOwnedSchema):
    @pre_load
    def pre_load(self, data):  # pylint: disable=no-self-use
        super().pre_load(data)
        data["slug"] = data.get("slug")
        data["owners"] = data.get("owners", [])
        if data["slug"]:
            data["slug"] = data["slug"].strip()
            data["slug"] = data["slug"].replace(" ", "-")
            data["slug"] = re.sub(r"[^\w\-]+", "", data["slug"])


class DashboardPostSchema(BaseDashboardSchema):
    __class_model__ = Dashboard

    dashboard_title = fields.String(allow_none=True, validate=Length(0, 500))
    slug = fields.String(
        allow_none=True, validate=[Length(1, 255), validate_slug_uniqueness]
    )
    owners = fields.List(fields.Integer(validate=validate_owner))
    position_json = fields.String(validate=validate_json)
    css = fields.String()
    json_metadata = fields.String(validate=validate_json_metadata)
    published = fields.Boolean()


class DashboardPutSchema(BaseDashboardSchema):
    dashboard_title = fields.String(allow_none=True, validate=Length(0, 500))
    slug = fields.String(allow_none=True, validate=Length(0, 255))
    owners = fields.List(fields.Integer(validate=validate_owner))
    position_json = fields.String(validate=validate_json)
    css = fields.String()
    json_metadata = fields.String(validate=validate_json_metadata)
    published = fields.Boolean()

    @post_load
    def make_object(self, data):  # pylint: disable=no-self-use
        if "owners" not in data and g.user not in self.instance.owners:
            self.instance.owners.append(g.user)
        for field in data:
            if field == "owners":
                self.set_owners(self.instance, data["owners"])
            else:
                setattr(self.instance, field, data.get(field))
        for slc in self.instance.slices:
            slc.owners = list(set(self.instance.owners) | set(slc.owners))
        return self.instance


class DashboardRestApi(DashboardMixin, BaseOwnedModelRestApi):
    datamodel = SQLAInterface(Dashboard)

    resource_name = "dashboard"
    allow_browser_login = True

    class_permission_name = "DashboardModelView"
    method_permission_name = {
        "get_list": "list",
        "get": "show",
        "post": "add",
        "put": "edit",
        "delete": "delete",
        "info": "list",
        "related": "list",
    }
    exclude_route_methods = ("info",)
    show_columns = [
        "dashboard_title",
        "slug",
        "owners.id",
        "owners.username",
        "position_json",
        "css",
        "json_metadata",
        "published",
        "table_names",
        "charts",
    ]
    order_columns = ["dashboard_title", "changed_on", "published", "changed_by_fk"]
    list_columns = [
        "id",
        "dashboard_title",
        "url",
        "published",
        "owners_json",
        "changed_by.username",
        "changed_by_name",
        "changed_by_url",
        "changed_on",
    ]

    add_model_schema = DashboardPostSchema()
    edit_model_schema = DashboardPutSchema()

    order_rel_fields = {
        "slices": ("slice_name", "asc"),
        "owners": ("first_name", "asc"),
    }
    filter_rel_fields_field = {"owners": "first_name", "slices": "slice_name"}


appbuilder.add_api(DashboardRestApi)
