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

import logging
from datetime import datetime
from typing import TYPE_CHECKING, Any

from superset.charts.filters import ChartFilter
from superset.daos.base import BaseDAO
from superset.extensions import db
from superset.models.core import FavStar, FavStarClassName
from superset.models.embedded import EmbeddedChart
from superset.models.slice import Slice
from superset.utils.core import get_user_id

if TYPE_CHECKING:
    pass

logger = logging.getLogger(__name__)


class ChartDAO(BaseDAO[Slice]):
    base_filter = ChartFilter

    @staticmethod
    def favorited_ids(charts: list[Slice]) -> list[FavStar]:
        ids = [chart.id for chart in charts]
        return [
            star.obj_id
            for star in db.session.query(FavStar.obj_id)
            .filter(
                FavStar.class_name == FavStarClassName.CHART,
                FavStar.obj_id.in_(ids),
                FavStar.user_id == get_user_id(),
            )
            .all()
        ]

    @staticmethod
    def add_favorite(chart: Slice) -> None:
        ids = ChartDAO.favorited_ids([chart])
        if chart.id not in ids:
            db.session.add(
                FavStar(
                    class_name=FavStarClassName.CHART,
                    obj_id=chart.id,
                    user_id=get_user_id(),
                    dttm=datetime.now(),
                )
            )

    @staticmethod
    def remove_favorite(chart: Slice) -> None:
        fav = (
            db.session.query(FavStar)
            .filter(
                FavStar.class_name == FavStarClassName.CHART,
                FavStar.obj_id == chart.id,
                FavStar.user_id == get_user_id(),
            )
            .one_or_none()
        )
        if fav:
            db.session.delete(fav)


class EmbeddedChartDAO(BaseDAO[EmbeddedChart]):
    # There isn't really a regular scenario where we would rather get Embedded by id
    id_column_name = "uuid"

    @staticmethod
    def upsert(chart: Slice, allowed_domains: list[str]) -> EmbeddedChart:
        """
        Sets up a dashboard to be embeddable.
        Upsert is used to preserve the embedded_chart uuid across updates.
        """
        embedded: EmbeddedChart = (
            chart.embedded[0] if chart.embedded else EmbeddedChart()
        )
        embedded.allow_domain_list = ",".join(allowed_domains)
        chart.embedded = [embedded]
        db.session.commit()
        return embedded

    @classmethod
    def create(
        cls,
        item: EmbeddedChartDAO | None = None,
        attributes: dict[str, Any] | None = None,
        commit: bool = True,
    ) -> Any:
        """
        Use EmbeddedChartDAO.upsert() instead.
        At least, until we are ok with more than one embedded item per chart.
        """
        raise NotImplementedError("Use EmbeddedChartDAO.upsert() instead.")
