import React from 'react';
import { InfoPanelWrapper, Alert, StyledH4, StyledCode, StyledP } from './styles';

import { PanelMsgParams } from 'src/Superstructure/types/global';
import { InfoIcon, ColumnWrapper, RowWrapper } from 'src/Superstructure/components';

const InfoPanel = ({ title, subTitle, body, extra, children }: PanelMsgParams) => (
  <InfoPanelWrapper>
    <Alert>
      <RowWrapper>
        <ColumnWrapper classes="col-md-1 tinycolumn">
          <InfoIcon color="#004085" />
        </ColumnWrapper>

        {title &&
          <ColumnWrapper classes="col-md-11">
            <StyledH4>{title || ''}</StyledH4>
          </ColumnWrapper>
        }

        {subTitle &&
          <ColumnWrapper classes="col-md-11">
            <StyledP>{subTitle || ''}</StyledP>
          </ColumnWrapper>        
        }

      </RowWrapper>
    
      {body &&
        <div style={{ marginTop: '20px' }}>
          <RowWrapper>
            <ColumnWrapper classes="col-md-11 offset-md-1">
              <StyledP>{body || ''}</StyledP>
            </ColumnWrapper>
          </RowWrapper>
        </div>
      }

      {children &&
        <div style={{ marginTop: '20px' }}>
          {children}
        </div>
      }

      {extra &&
        <div style={{ marginTop: '20px' }}>
          <RowWrapper>
            <ColumnWrapper classes="col-md-11 offset-md-1">
              <StyledCode>{extra || ''}</StyledCode>
            </ColumnWrapper>
          </RowWrapper>
        </div>
      }

    </Alert>
  </InfoPanelWrapper>
);

export { InfoPanel };
