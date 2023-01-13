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
from __future__ import absolute_import, division, print_function, unicode_literals

from typing import Any, Dict, List

import simplejson as json
from flask import request, Response
from flask_appbuilder import expose
from flask_appbuilder.hooks import before_request
from flask_appbuilder.models.sqla.interface import SQLAInterface
from flask_appbuilder.security.decorators import has_access, has_access_api
from jinja2.sandbox import SandboxedEnvironment
from sqlalchemy import and_, func
from werkzeug.exceptions import NotFound

from superset import db, is_feature_enabled, utils
from superset.connectors.sqla.models import SqlaTable
from superset.jinja_context import ExtraCache
from superset.models.dashboard import Dashboard
from superset.models.slice import Slice
from superset.models.sql_lab import SavedQuery
from superset.superset_typing import FlaskResponse
from superset.tags.models import ObjectTypes, Tag, TaggedObject, TagTypes
from superset.views.base import SupersetModelView

from .base import BaseSupersetView, json_success


def process_template(content: str) -> str:
    env = SandboxedEnvironment()
    template = env.from_string(content)
    context = {
        "current_user_id": ExtraCache.current_user_id,
        "current_username": ExtraCache.current_username,
    }
    return template.render(context)


class TagModelView(SupersetModelView):
    route_base = "/superset/tags"
    datamodel = SQLAInterface(Tag)
    class_permission_name = "Tags"

    @has_access
    @expose("/")
    def list(self) -> FlaskResponse:
        if not is_feature_enabled("TAGGING_SYSTEM"):
            return super().list()

        return super().render_app_template()


class TagView(BaseSupersetView):
    @staticmethod
    def is_enabled() -> bool:
        return is_feature_enabled("TAGGING_SYSTEM")

    @before_request
    def ensure_enabled(self) -> None:
        if not self.is_enabled():
            raise NotFound()

    @has_access_api
    @expose("/tags/", methods=["GET"])
    def tags(self) -> FlaskResponse:  # pylint: disable=no-self-use
        query = (
            db.session.query(Tag)
            # .with_entities(Tag.name, Tag.id)
            # .group_by(TaggedObject.tag_id, Tag.name)
            # .order_by(func.count().desc())
            .all()
        )
        results = [
            {
                "id": obj.id,
                "type": obj.type.name,
                "name": obj.name,
                "changed_on": obj.changed_on,
                "changed_by": obj.changed_by_fk,
                "created_by": obj.created_by_fk,
            }
            for obj in query
        ]
        return json_success(json.dumps(results, default=utils.core.json_int_dttm_ser))

    @has_access_api
    @expose("/tags/suggestions/", methods=["GET"])
    def suggestions(self) -> FlaskResponse:  # pylint: disable=no-self-use
        query = (
            db.session.query(TaggedObject)
            .join(Tag)
            .with_entities(TaggedObject.tag_id, Tag.name)
            .group_by(TaggedObject.tag_id, Tag.name)
            .order_by(func.count().desc())
            .all()
        )
        tags = [{"id": id, "name": name} for id, name in query]
        return json_success(json.dumps(tags))

    @has_access_api
    @expose("/tags/<object_type:object_type>/<int:object_id>/", methods=["GET"])
    def get(  # pylint: disable=no-self-use
        self, object_type: ObjectTypes, object_id: int
    ) -> FlaskResponse:
        """List all tags a given object has."""
        if object_id == 0:
            return json_success(json.dumps([]))

        query = db.session.query(TaggedObject).filter(
            and_(
                TaggedObject.object_type == object_type,
                TaggedObject.object_id == object_id,
            )
        )
        tags = [{"id": obj.tag.id, "name": obj.tag.name} for obj in query]
        return json_success(json.dumps(tags))

    @has_access_api
    @expose("/tags/<object_type:object_type>/<int:object_id>/", methods=["POST"])
    def post(  # pylint: disable=no-self-use
        self, object_type: ObjectTypes, object_id: int
    ) -> FlaskResponse:
        """Add new tags to an object."""
        if object_id == 0:
            return Response(status=404)

        tagged_objects = []
        for name in request.get_json(force=True):
            if ":" in name:
                type_name = name.split(":", 1)[0]
                type_ = TagTypes[type_name]
            else:
                type_ = TagTypes.custom
            tag_name = name.strip()
            tag = db.session.query(Tag).filter_by(name=tag_name, type=type_).first()
            if not tag:
                tag = Tag(name=tag_name, type=type_)

            tagged_objects.append(
                TaggedObject(object_id=object_id, object_type=object_type, tag=tag)
            )

        db.session.add_all(tagged_objects)
        db.session.commit()

        return Response(status=201)  # 201 CREATED

    @has_access_api
    @expose("/tags/<object_type:object_type>/<int:object_id>/", methods=["DELETE"])
    def delete_tagged_objects(  # pylint: disable=no-self-use
        self, object_type: ObjectTypes, object_id: int
    ) -> FlaskResponse:
        """Remove tags from an object."""
        tag_names = request.get_json(force=True)
        if not tag_names:
            return Response(status=403)

        db.session.query(TaggedObject).filter(
            and_(
                TaggedObject.object_type == object_type,
                TaggedObject.object_id == object_id,
            ),
            TaggedObject.tag.has(Tag.name.in_(tag_names)),
        ).delete(synchronize_session=False)
        db.session.commit()

        return Response(status=204)  # 204 NO CONTENT

    @has_access_api
    @expose("/tags", methods=["DELETE"])
    def delete_tags(self) -> FlaskResponse:  # pylint: disable=no-self-use
        """Remove tags, and all tagged objects with that tag"""
        tag_names = request.get_json(force=True)
        if not tag_names:
            return Response(status=403)
        db.session()
        db.session.query(TaggedObject).filter(
            TaggedObject.tag.has(Tag.name.in_(tag_names)),
        ).delete(synchronize_session=False)
        db.session.query(Tag).filter(
            Tag.name.in_(tag_names),
        ).delete(synchronize_session=False)
        db.session.commit()

        return Response(status=204)  # 204 NO CONTENT

    @has_access_api
    @expose("/tagged_objects/", methods=["GET", "POST"])
    def tagged_objects(self) -> FlaskResponse:  # pylint: disable=no-self-use
        tags = [
            process_template(tag)
            for tag in request.args.get("tags", "").split(",")
            if tag
        ]
        if not tags:
            return json_success(json.dumps([]))

        # filter types
        types = [type_ for type_ in request.args.get("types", "").split(",") if type_]

        results: List[Dict[str, Any]] = []

        # dashboards
        if not types or "dashboard" in types:
            dashboards = (
                db.session.query(Dashboard)
                .join(
                    TaggedObject,
                    and_(
                        TaggedObject.object_id == Dashboard.id,
                        TaggedObject.object_type == ObjectTypes.dashboard,
                    ),
                )
                .join(Tag, TaggedObject.tag_id == Tag.id)
                .filter(Tag.name.in_(tags))
            )
            results.extend(
                {
                    "id": obj.id,
                    "type": ObjectTypes.dashboard.name,
                    "name": obj.dashboard_title,
                    "url": obj.url,
                    "changed_on": obj.changed_on,
                    "created_by": obj.created_by_fk,
                    "creator": obj.creator(),
                }
                for obj in dashboards
            )

        # charts
        if not types or "chart" in types:
            charts = (
                db.session.query(Slice)
                .join(
                    TaggedObject,
                    and_(
                        TaggedObject.object_id == Slice.id,
                        TaggedObject.object_type == ObjectTypes.chart,
                    ),
                )
                .join(Tag, TaggedObject.tag_id == Tag.id)
                .filter(Tag.name.in_(tags))
            )
            results.extend(
                {
                    "id": obj.id,
                    "type": ObjectTypes.chart.name,
                    "name": obj.slice_name,
                    "url": obj.url,
                    "changed_on": obj.changed_on,
                    "created_by": obj.created_by_fk,
                    "creator": obj.creator(),
                }
                for obj in charts
            )

        # saved queries
        if not types or "query" in types:
            saved_queries = (
                db.session.query(SavedQuery)
                .join(
                    TaggedObject,
                    and_(
                        TaggedObject.object_id == SavedQuery.id,
                        TaggedObject.object_type == ObjectTypes.query,
                    ),
                )
                .join(Tag, TaggedObject.tag_id == Tag.id)
                .filter(Tag.name.in_(tags))
            )
            results.extend(
                {
                    "id": obj.id,
                    "type": ObjectTypes.query.name,
                    "name": obj.label,
                    "url": obj.url(),
                    "changed_on": obj.changed_on,
                    "created_by": obj.created_by_fk,
                    "creator": obj.creator(),
                }
                for obj in saved_queries
            )

        # datasets
        if not types or "dataset" in types:
            datasets = (
                db.session.query(SqlaTable)
                .join(
                    TaggedObject,
                    and_(
                        TaggedObject.object_id == SqlaTable.id,
                        TaggedObject.object_type == ObjectTypes.dataset,
                    ),
                )
                .join(Tag, TaggedObject.tag_id == Tag.id)
                .filter(Tag.name.in_(tags))
            )
            results.extend(
                {
                    "id": obj.id,
                    "type": ObjectTypes.dataset.name,
                    "name": obj.table_name,
                    "url": obj.sql_url(),
                    "changed_on": obj.changed_on,
                    "created_by": obj.created_by_fk,
                    "creator": obj.creator(),
                }
                for obj in datasets
            )

        return json_success(json.dumps(results, default=utils.core.json_int_dttm_ser))
