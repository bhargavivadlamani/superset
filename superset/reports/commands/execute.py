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
import logging
from datetime import datetime, timedelta
from typing import Optional

from sqlalchemy.orm import Session

from superset import app, thumbnail_cache
from superset.commands.base import BaseCommand
from superset.commands.exceptions import CommandException
from superset.extensions import security_manager
from superset.models.reports import (
    ReportExecutionLog,
    ReportLogState,
    ReportSchedule,
    ReportScheduleType,
)
from superset.reports.commands.alert import AlertCommand
from superset.reports.commands.exceptions import (
    ReportScheduleAlertGracePeriodError,
    ReportScheduleExecuteUnexpectedError,
    ReportScheduleNotFoundError,
    ReportSchedulePreviousWorkingError,
    ReportScheduleScreenshotFailedError,
)
from superset.reports.dao import ReportScheduleDAO
from superset.reports.notifications import create_notification
from superset.reports.notifications.base import NotificationContent, ScreenshotData
from superset.utils.celery import session_scope
from superset.utils.screenshots import (
    BaseScreenshot,
    ChartScreenshot,
    DashboardScreenshot,
)
from superset.utils.urls import get_url_path

logger = logging.getLogger(__name__)


class AsyncExecuteReportScheduleCommand(BaseCommand):
    """
    Execute all types of report schedules.
    - On reports takes chart or dashboard screenshots and sends configured notifications
    - On Alerts uses related Command AlertCommand and sends configured notifications
    """

    def __init__(self, model_id: int, scheduled_dttm: datetime):
        self._model_id = model_id
        self._model: Optional[ReportSchedule] = None
        self._scheduled_dttm = scheduled_dttm

    def set_state_and_log(
        self,
        session: Session,
        start_dttm: datetime,
        state: ReportLogState,
        error_message: Optional[str] = None,
    ) -> None:
        """
        Updates current ReportSchedule state and TS. If on final state writes the log
        for this execution
        """
        now_dttm = datetime.utcnow()
        if state == ReportLogState.WORKING:
            self.set_state(session, state, now_dttm)
            return
        self.set_state(session, state, now_dttm)
        self.create_log(
            session, start_dttm, now_dttm, state, error_message=error_message,
        )

    def set_state(
        self, session: Session, state: ReportLogState, dttm: datetime
    ) -> None:
        """
        Set the current report schedule state, on this case we want to
        commit immediately
        """
        if self._model:
            self._model.last_state = state
            self._model.last_eval_dttm = dttm
            session.commit()

    def create_log(  # pylint: disable=too-many-arguments
        self,
        session: Session,
        start_dttm: datetime,
        end_dttm: datetime,
        state: ReportLogState,
        error_message: Optional[str] = None,
    ) -> None:
        """
        Creates a Report execution log, uses the current computed last_value for Alerts
        """
        if self._model:
            log = ReportExecutionLog(
                scheduled_dttm=self._scheduled_dttm,
                start_dttm=start_dttm,
                end_dttm=end_dttm,
                value=self._model.last_value,
                value_row_json=self._model.last_value_row_json,
                state=state,
                error_message=error_message,
                report_schedule=self._model,
            )
            session.add(log)

    def get_url(self, user_friendly: bool = False) -> str:
        """
        Get the url for this report schedule: chart or dashboard
        """
        if not self._model:
            raise ReportScheduleExecuteUnexpectedError()
        if self._model.chart:
            return get_url_path(
                "Superset.slice",
                user_friendly=user_friendly,
                slice_id=self._model.chart_id,
                standalone="true",
            )
        return get_url_path(
            "Superset.dashboard",
            user_friendly=user_friendly,
            dashboard_id_or_slug=self._model.dashboard_id,
        )

    def get_screenshot(self) -> ScreenshotData:
        """
        Get a chart or dashboard screenshot
        :raises: ReportScheduleScreenshotFailedError
        """
        if not self._model:
            raise ReportScheduleExecuteUnexpectedError()
        url = self.get_url()
        screenshot: Optional[BaseScreenshot] = None
        if self._model.chart:
            screenshot = ChartScreenshot(url, self._model.chart.digest)
        else:
            screenshot = DashboardScreenshot(url, self._model.dashboard.digest)
        image_url = self.get_url(user_friendly=True)
        user = security_manager.find_user(app.config["THUMBNAIL_SELENIUM_USER"])
        image_data = screenshot.compute_and_cache(
            user=user, cache=thumbnail_cache, force=True,
        )
        if not image_data:
            raise ReportScheduleScreenshotFailedError()
        return ScreenshotData(url=image_url, image=image_data)

    def get_notification_content(self) -> NotificationContent:
        """
        Gets a notification content, this is composed by a title and a screenshot
        :raises: ReportScheduleScreenshotFailedError
        """
        if not self._model:
            raise ReportScheduleExecuteUnexpectedError()
        screenshot_data = self.get_screenshot()
        if self._model.chart:
            name = self._model.chart.slice_name
        else:
            name = self._model.dashboard.dashboard_title
        return NotificationContent(name=name, screenshot=screenshot_data)

    def run(self) -> None:
        with session_scope(nullpool=True) as session:
            try:
                start_dttm = datetime.utcnow()
                self.validate(session=session)
                if not self._model:
                    raise ReportScheduleExecuteUnexpectedError()
                self.set_state_and_log(session, start_dttm, ReportLogState.WORKING)
                # If it's an alert check if the alert is triggered
                if self._model.type == ReportScheduleType.ALERT:
                    if not AlertCommand(self._model).run():
                        self.set_state_and_log(session, start_dttm, ReportLogState.NOOP)
                        return
                notification_content = self.get_notification_content()
                for recipient in self._model.recipients:
                    notification = create_notification(recipient, notification_content)
                    notification.send()

                # Log, state and TS
                self.set_state_and_log(session, start_dttm, ReportLogState.SUCCESS)
            except ReportScheduleAlertGracePeriodError as ex:
                self.set_state_and_log(
                    session, start_dttm, ReportLogState.NOOP, error_message=str(ex)
                )
            except CommandException as ex:
                self.set_state_and_log(
                    session, start_dttm, ReportLogState.ERROR, error_message=str(ex)
                )
                logger.error("Failed to execute report schedule: %s", ex)

    def validate(  # pylint: disable=arguments-differ
        self, session: Session = None
    ) -> None:
        # Validate/populate model exists
        self._model = ReportScheduleDAO.find_by_id(self._model_id, session=session)
        if not self._model:
            raise ReportScheduleNotFoundError()
        # Avoid overlap processing
        if self._model.last_state == ReportLogState.WORKING:
            raise ReportSchedulePreviousWorkingError()
        # Check grace period
        if self._model.type == ReportScheduleType.ALERT:
            last_success = ReportScheduleDAO.find_last_success_log(session)
            if (
                last_success
                and self._model.last_state
                in (ReportLogState.SUCCESS, ReportLogState.NOOP)
                and self._model.grace_period
                and datetime.utcnow() - timedelta(seconds=self._model.grace_period)
                < last_success.end_dttm
            ):
                raise ReportScheduleAlertGracePeriodError()
