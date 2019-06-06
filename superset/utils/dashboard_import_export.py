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
# pylint: disable=C,R,W
import json
import logging
import os
import shutil
import tempfile
import time

import pandas as pd
import requests

from superset import db
from superset.exceptions import SupersetException
from superset.models.core import Dashboard
from superset.utils.core import DashboardEncoder, decode_dashboards, \
    get_or_create_example_db, get_or_create_main_db                           


def import_dashboards(session, data_stream, import_time=None):
    """Imports dashboards from a stream to databases"""
    current_tt = int(time.time())
    import_time = current_tt if import_time is None else import_time

    data = json.loads(data_stream.read(), object_hook=decode_dashboards)

    for table in data['datasources']:
        type(table).import_obj(table, import_time=import_time)

    # TODO: import DRUID datasources
    session.commit()
    for dashboard in data['dashboards']:
        Dashboard.import_obj(
            dashboard, import_time=import_time)

    # Import any files in this exported Dashboard
    if 'files' in data:
        if len(data['files']) > 0:
            examples_engine = get_or_create_main_db()
            for table in data['files']:
                logging.info(f'Import data from file {table["file_name"]} into table ' +
                             f'{table["table_name"]}')
                df = pd.read_csv(table['file_name'], parse_dates=True,
                                 infer_datetime_format=True, compression='infer')
                df.to_sql(
                    table['table_name'],
                    examples_engine.get_sqla_engine(),
                    if_exists='replace',
                    chunksize=500,
                    index=False)

    session.commit()


def import_example_dashboard(session, import_example_json, data_blob_urls,
                             database_uri, import_time=None):
    """Imports dashboards from a JSON string and data files to databases"""
    data = json.loads(import_example_json, object_hook=decode_dashboards)

    # TODO: import DRUID datasources
    session.commit()
    for dashboard in data['dashboards']:
        Dashboard.import_obj(
            dashboard, import_time=import_time)

    if len(data['files']) > 0:
        examples_engine = get_or_create_example_db(database_uri)

        with tempfile.TemporaryDirectory() as tmpdir:
            for file_info in data['files']:
                # Get the github info for the file
                blob_file_path = f'{tmpdir}{os.path.sep}{file_info["file_name"]}'
                blob_url = data_blob_urls[file_info['file_name']]

                response = requests.get(blob_url, stream=True)
                with open(blob_file_path, 'wb') as out_file:
                    shutil.copyfileobj(response.raw, out_file)
                del response

                df = pd.read_csv(blob_file_path, parse_dates=True,
                                 infer_datetime_format=True, compression='infer')
                df.to_sql(
                    file_info['table_name'],
                    examples_engine.get_sqla_engine(),
                    if_exists='replace',
                    chunksize=500,
                    index=False)

    session.commit()


def export_dashboards(session, dashboard_ids=None, dashboard_titles=None,
                      export_data=False, export_data_dir=None, description=None,
                      export_title=None, _license='Apache 2.0', strip_database=False):
    """Returns all dashboards metadata as a json dump"""
    logging.info('Starting export')
    export_dashboard_ids = []

    session = db.session() if not session else session
    query = session.query(Dashboard)
    if dashboard_ids or dashboard_titles:
        query = query.filter(Dashboard.id.in_(dashboard_ids) |
                             Dashboard.dashboard_title.in_(dashboard_titles))

    export_dashboard_ids = [d.id for d in query.all()]

    data = {}
    if not export_dashboard_ids:
        logging.error('No dashboards found!')
        raise SupersetException('No dashboards found!')
    else:
        data = Dashboard.export_dashboards(export_dashboard_ids,
                                           export_data, export_data_dir)

    if export_title:
        data['description']['title'] = export_title
    if description:
        data['description']['description'] = description
    data['description']['license'] = _license

    export_json = json.dumps(data, cls=DashboardEncoder, indent=4, sort_keys=True)

    # Remove datasources[].__SqlaTable__.database for example export
    # if strip_database:
    #     parsed_json = json.loads(export_json)
    #     for datasource in parsed_json['datasources']:
    #         datasource['__SqlaTable__']['database'] = None
    #     export_json = '{}'  # json.dumps(parsed_json, indent=4, sort_keys=True)

    return export_json


def get_slug(session, dashboard_id=None, dashboard_title=None):
    """Get the slug for the name of the directory inside the tarballed example"""
    session = db.session() if not session else session
    query = session.query(Dashboard)
    slug = None
    if dashboard_id or dashboard_title:
        query = query.filter((Dashboard.id == dashboard_id) |
                             (Dashboard.dashboard_title == dashboard_title))
        dashboard = query.first()
        slug = getattr(dashboard, 'slug', None)
    return slug
