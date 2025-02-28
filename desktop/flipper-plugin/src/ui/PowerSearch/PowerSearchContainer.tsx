/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import * as React from 'react';
import {css} from '@emotion/css';
import {theme} from '../theme';

const containerStyle = css`
  flex: 1 0 auto;
  background-color: ${theme.white};
  display: flex;
  flex-direction: row;
  border-radius: ${theme.borderRadius};
  border: 1px solid ${theme.borderColor};
  transition: all 0.3s cubic-bezier(0.645, 0.045, 0.355, 1);
  padding: 0 ${theme.space.tiny}px;

  &:focus-within,
  &:hover {
    border-color: ${theme.primaryColor};
    box-shadow: 0 0 0 2px rgba(114, 46, 209, 0.2);
  }
`;

export const PowerSearchContainer: React.FC = ({children}) => {
  return <div className={containerStyle}>{children}</div>;
};
