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

# pylint: disable=import-outside-toplevel, invalid-name, line-too-long

from pytest_mock import MockFixture

from superset.errors import ErrorLevel, SupersetError, SupersetErrorType


class ProgrammingError(Exception):
    """
    Dummy ProgrammingError so we don't need to import the optional gsheets.
    """


def test_validate_parameters_simple() -> None:
    from superset.db_engine_specs.gsheets import (
        GSheetsEngineSpec,
        GSheetsParametersType,
    )

    parameters: GSheetsParametersType = {
        "service_account_info": "",
        "catalog": {},
    }
    errors = GSheetsEngineSpec.validate_parameters(parameters)
    assert errors == [
        SupersetError(
            message="Sheet name is required",
            error_type=SupersetErrorType.CONNECTION_MISSING_PARAMETERS_ERROR,
            level=ErrorLevel.WARNING,
            extra={"catalog": {"idx": 0, "name": True}},
        ),
    ]


def test_validate_parameters_catalog(
    mocker: MockFixture,
) -> None:
    from superset.db_engine_specs.gsheets import (
        GSheetsEngineSpec,
        GSheetsParametersType,
    )

    g = mocker.patch("superset.db_engine_specs.gsheets.g")
    g.user.email = "admin@example.com"

    create_engine = mocker.patch("superset.db_engine_specs.gsheets.create_engine")
    conn = create_engine.return_value.connect.return_value
    results = conn.execute.return_value
    results.fetchall.side_effect = [
        ProgrammingError("The caller does not have permission"),
        [(1,)],
        ProgrammingError("Unsupported table: https://www.google.com/"),
    ]

    parameters: GSheetsParametersType = {
        "service_account_info": "",
        "catalog": {
            "private_sheet": "https://docs.google.com/spreadsheets/d/1/edit",
            "public_sheet": "https://docs.google.com/spreadsheets/d/1/edit#gid=1",
            "not_a_sheet": "https://www.google.com/",
        },
    }
    errors = GSheetsEngineSpec.validate_parameters(parameters)  # ignore: type

    assert errors == [
        SupersetError(
            message=(
                "The URL could not be identified. Please check for typos "
                "and make sure that ‘Type of Google Sheets allowed’ "
                "selection matches the input."
            ),
            error_type=SupersetErrorType.TABLE_DOES_NOT_EXIST_ERROR,
            level=ErrorLevel.WARNING,
            extra={
                "catalog": {
                    "idx": 0,
                    "url": True,
                },
                "issue_codes": [
                    {
                        "code": 1003,
                        "message": "Issue 1003 - There is a syntax error in the SQL query. Perhaps there was a misspelling or a typo.",
                    },
                    {
                        "code": 1005,
                        "message": "Issue 1005 - The table was deleted or renamed in the database.",
                    },
                ],
            },
        ),
        SupersetError(
            message=(
                "The URL could not be identified. Please check for typos "
                "and make sure that ‘Type of Google Sheets allowed’ "
                "selection matches the input."
            ),
            error_type=SupersetErrorType.TABLE_DOES_NOT_EXIST_ERROR,
            level=ErrorLevel.WARNING,
            extra={
                "catalog": {
                    "idx": 2,
                    "url": True,
                },
                "issue_codes": [
                    {
                        "code": 1003,
                        "message": "Issue 1003 - There is a syntax error in the SQL query. Perhaps there was a misspelling or a typo.",
                    },
                    {
                        "code": 1005,
                        "message": "Issue 1005 - The table was deleted or renamed in the database.",
                    },
                ],
            },
        ),
    ]

    create_engine.assert_called_with(
        "gsheets://",
        service_account_info={},
        subject="admin@example.com",
    )


def test_validate_parameters_catalog_and_credentials(
    mocker: MockFixture,
) -> None:
    from superset.db_engine_specs.gsheets import (
        GSheetsEngineSpec,
        GSheetsParametersType,
    )

    g = mocker.patch("superset.db_engine_specs.gsheets.g")
    g.user.email = "admin@example.com"

    create_engine = mocker.patch("superset.db_engine_specs.gsheets.create_engine")
    conn = create_engine.return_value.connect.return_value
    results = conn.execute.return_value
    results.fetchall.side_effect = [
        [(2,)],
        [(1,)],
        ProgrammingError("Unsupported table: https://www.google.com/"),
    ]

    parameters: GSheetsParametersType = {
        "service_account_info": "",
        "catalog": {
            "private_sheet": "https://docs.google.com/spreadsheets/d/1/edit",
            "public_sheet": "https://docs.google.com/spreadsheets/d/1/edit#gid=1",
            "not_a_sheet": "https://www.google.com/",
        },
    }
    errors = GSheetsEngineSpec.validate_parameters(parameters)  # ignore: type
    assert errors == [
        SupersetError(
            message=(
                "The URL could not be identified. Please check for typos "
                "and make sure that ‘Type of Google Sheets allowed’ "
                "selection matches the input."
            ),
            error_type=SupersetErrorType.TABLE_DOES_NOT_EXIST_ERROR,
            level=ErrorLevel.WARNING,
            extra={
                "catalog": {
                    "idx": 2,
                    "url": True,
                },
                "issue_codes": [
                    {
                        "code": 1003,
                        "message": "Issue 1003 - There is a syntax error in the SQL query. Perhaps there was a misspelling or a typo.",
                    },
                    {
                        "code": 1005,
                        "message": "Issue 1005 - The table was deleted or renamed in the database.",
                    },
                ],
            },
        )
    ]

    create_engine.assert_called_with(
        "gsheets://",
        service_account_info={},
        subject="admin@example.com",
    )


def test_get_parameters_from_uri() -> None:
    """
    Test that the private key in the credentials is properly masked.
    """
    from superset.db_engine_specs.gsheets import GSheetsEngineSpec

    uri = "gsheets://"
    encrypted_extra = {
        "service_account_info": {
            "type": "service_account",
            "project_id": "black-sanctum-314419",
            "private_key_id": "259b0d419a8f840056158763ff54d8b08f7b8173",
            "private_key": "SECRET",
            "client_email": "google-spreadsheets-demo-servi@black-sanctum-314419.iam.gserviceaccount.com",
            "client_id": "114567578578109757129",
            "auth_uri": "https://accounts.google.com/o/oauth2/auth",
            "token_uri": "https://oauth2.googleapis.com/token",
            "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
            "client_x509_cert_url": "https://www.googleapis.com/robot/v1/metadata/x509/google-spreadsheets-demo-servi%40black-sanctum-314419.iam.gserviceaccount.com",
        },
    }

    assert GSheetsEngineSpec.get_parameters_from_uri(uri, encrypted_extra) == {
        "service_account_info": {
            "type": "service_account",
            "project_id": "black-sanctum-314419",
            "private_key_id": "259b0d419a8f840056158763ff54d8b08f7b8173",
            "private_key": "XXXXXXXXXX",
            "client_email": "google-spreadsheets-demo-servi@black-sanctum-314419.iam.gserviceaccount.com",
            "client_id": "114567578578109757129",
            "auth_uri": "https://accounts.google.com/o/oauth2/auth",
            "token_uri": "https://oauth2.googleapis.com/token",
            "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
            "client_x509_cert_url": "https://www.googleapis.com/robot/v1/metadata/x509/google-spreadsheets-demo-servi%40black-sanctum-314419.iam.gserviceaccount.com",
        },
    }


def test_unmask_encrypted_extra() -> None:
    """
    Test that the private key can be reused from the previous ``encrypted_extra``.
    """
    from superset.db_engine_specs.gsheets import GSheetsEngineSpec

    old = {
        "service_account_info": {
            "project_id": "black-sanctum-314419",
            "private_key": "SECRET",
        },
    }
    new = {
        "service_account_info": {
            "project_id": "yellow-unicorn-314419",
            "private_key": "XXXXXXXXXX",
        },
    }

    assert GSheetsEngineSpec.unmask_encrypted_extra(old, new) == {
        "service_account_info": {
            "project_id": "yellow-unicorn-314419",
            "private_key": "SECRET",
        },
    }
