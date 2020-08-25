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
"""refractor_alerting_framework

Revision ID: 645d1a223aff
Revises: f80a3b88324b
Create Date: 2020-08-25 14:08:53.230283

"""

# revision identifiers, used by Alembic.
revision = '645d1a223aff'
down_revision = 'f80a3b88324b'

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import mysql

def upgrade():
    # ### commands auto generated by Alembic - please adjust! ###
    op.create_table('alert_validators',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('name', sa.String(length=150), nullable=False),
    sa.Column('validator_type', sa.Enum('not_null', 'range', 'threshold_increase', 'threshold_decrease', 'percent_difference', 'integer_difference', name='alertvalidatortype'), nullable=True),
    sa.Column('config', sa.Text(), nullable=True),
    sa.Column('alert_id', sa.Integer(), nullable=False),
    sa.ForeignKeyConstraint(['alert_id'], ['alerts.id'], ),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_table('sql_observers',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('name', sa.String(length=150), nullable=False),
    sa.Column('observation_value_type', sa.Enum('sql_result', 'numerical', name='sqlobservationvaluetype'), nullable=True),
    sa.Column('sql', sa.Text(), nullable=False),
    sa.Column('alert_id', sa.Integer(), nullable=False),
    sa.Column('database_id', sa.Integer(), nullable=False),
    sa.ForeignKeyConstraint(['alert_id'], ['alerts.id'], ),
    sa.ForeignKeyConstraint(['database_id'], ['dbs.id'], ),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_table('sql_observations',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('dttm', sa.DateTime(), nullable=True),
    sa.Column('observer_id', sa.Integer(), nullable=False),
    sa.Column('sql_result', sa.Text(), nullable=True),
    sa.Column('value', sa.Float(), nullable=True),
    sa.ForeignKeyConstraint(['observer_id'], ['sql_observers.id'], ),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_sql_observations_dttm'), 'sql_observations', ['dttm'], unique=False)
    op.alter_column('alerts', 'crontab',
               existing_type=mysql.VARCHAR(length=50),
               nullable=False)
    op.drop_column('alerts', 'sql')
    op.drop_column('alerts', 'database_id')
    # ### end Alembic commands ###


def downgrade():
    # ### commands auto generated by Alembic - please adjust! ###
    op.add_column('alerts', sa.Column('database_id', mysql.INTEGER(), autoincrement=False, nullable=False))
    op.add_column('alerts', sa.Column('sql', mysql.TEXT(), nullable=True))
    op.alter_column('alerts', 'crontab',
               existing_type=mysql.VARCHAR(length=50),
               nullable=True)

    op.drop_index(op.f('ix_sql_observations_dttm'), table_name='sql_observations')
    op.drop_table('sql_observations')
    op.drop_table('sql_observers')
    op.drop_table('alert_validators')
    # ### end Alembic commands ###
