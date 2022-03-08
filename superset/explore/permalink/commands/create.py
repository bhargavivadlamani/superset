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
import logging
from typing import Any, Dict, Optional

from flask_appbuilder.security.sqla.models import User
from flask_babel import gettext as _
from sqlalchemy.exc import SQLAlchemyError

from superset.commands.base import BaseCommand
from superset.explore.permalink.exceptions import ExplorePermalinkCreateFailedError
from superset.explore.utils import check_access
from superset.key_value.commands.create import CreateKeyValueCommand
from superset.key_value.types import KeyType

logger = logging.getLogger(__name__)


class CreateExplorePermalinkCommand(BaseCommand):
    def __init__(
        self,
        actor: User,
        chart_id: Optional[int],
        dataset_id: int,
        state: Dict[str, Any],
        key_type: KeyType,
    ):
        self.actor = actor
        self.chart_id = chart_id
        self.dataset_id = dataset_id
        self.state = state
        self.key_type = key_type

    def run(self) -> str:
        self.validate()
        try:
            check_access(self.dataset_id, self.chart_id, self.actor)
            form_data = self.state.get("form_data", {})
            value = json.dumps(
                {
                    "chart_id": self.chart_id,
                    "dataset_id": self.dataset_id,
                    "form_data": form_data,
                }
            )
            command = CreateKeyValueCommand(self.actor, value, self.key_type)
            key = command.run()
            return key
        except SQLAlchemyError as ex:
            logger.exception("Error running create command")
            raise ExplorePermalinkCreateFailedError() from ex

    def validate(self) -> None:
        if len(self.state) != 1 or "form_data" not in self.state:
            raise ExplorePermalinkCreateFailedError(message=_("invalid state"))
