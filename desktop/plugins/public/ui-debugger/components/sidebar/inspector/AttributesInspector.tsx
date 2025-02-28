/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import React from 'react';
import {
  Inspectable,
  InspectableObject,
  Metadata,
  MetadataId,
  ClientNode,
} from '../../../ClientTypes';
import {DataInspector, Panel, styled} from 'flipper-plugin';
import {Col, Row} from 'antd';
import {displayableName} from '../utilities/displayableName';
import ColorInspector from './ColorInspector';
import SizeInspector from './SizeInspector';
import SpaceBoxInspector from './SpaceBoxInspector';
import BoundsInspector from './BoundsInspector';
import Coordinate3DInspector from './Coordinate3DInspector';
import CoordinateInspector from './CoordinateInspector';
import {
  AutoMarginStyle,
  BooleanAttributeValueStyle,
  EnumAttributeValueStyle,
  NumberAttributeValueStyle,
  ObjectContainerStyle,
  RowStyle,
  TextAttributeValueStyle,
} from './Styles';
import {transform} from '../../../utils/dataTransform';
import {NoData} from './NoData';

const NumberValue = styled.span(NumberAttributeValueStyle);
const BooleanValue = styled.span(BooleanAttributeValueStyle);
const TextValue = styled.span(TextAttributeValueStyle);
const EnumValue = styled.span(EnumAttributeValueStyle);
const ObjectContainer = styled.div(ObjectContainerStyle);
const CenteredContentContainer = styled.div(AutoMarginStyle);

type NamedAttributeInspectorProps = {
  name: string;
};

const NamedAttributeInspector: React.FC<NamedAttributeInspectorProps> = ({
  name,
  children,
}) => {
  return (
    <Row style={RowStyle} justify="center" align="middle" gutter={[16, 0]}>
      <Col span={8} style={AutoMarginStyle}>
        {name}
      </Col>
      <Col span={16}>
        <CenteredContentContainer>{children}</CenteredContentContainer>
      </Col>
    </Row>
  );
};

const ObjectAttributeInspector: React.FC<{
  metadata: Map<MetadataId, Metadata>;
  name: string;
  fields: Record<MetadataId, Inspectable>;
  level: number;
}> = ({metadata, name, fields, level}) => {
  return (
    <div style={RowStyle}>
      {name}
      {Object.entries(fields).map(([key, value]) => {
        const metadataId: number = Number(key);
        const attributeName = metadata.get(metadataId)?.name ?? key;
        return (
          <ObjectContainer
            key={metadataId}
            style={{
              paddingLeft: level,
            }}>
            {create(metadata, attributeName, value, level + 5)}
          </ObjectContainer>
        );
      })}
    </div>
  );
};

const ArrayAttributeInspector: React.FC<{
  metadata: Map<MetadataId, Metadata>;
  name: string;
  items: Inspectable[];
  level: number;
}> = ({metadata, name, items, level}) => {
  return (
    <div style={RowStyle}>
      {name}
      {items.map(function (item, idx) {
        const inspectableValue = item;
        const attributeName = idx.toString();
        return (
          <ObjectContainer
            key={name + idx}
            style={{
              paddingLeft: level,
            }}>
            {create(metadata, attributeName, inspectableValue, level + 5)}
          </ObjectContainer>
        );
      })}
    </div>
  );
};

function create(
  metadata: Map<MetadataId, Metadata>,
  name: string,
  inspectable: Inspectable,
  level: number = 2,
) {
  switch (inspectable?.type) {
    case 'boolean':
      return (
        <NamedAttributeInspector name={displayableName(name)}>
          <BooleanValue>{inspectable.value ? 'TRUE' : 'FALSE'}</BooleanValue>
        </NamedAttributeInspector>
      );
    case 'enum':
      return (
        <NamedAttributeInspector name={displayableName(name)}>
          <EnumValue>{inspectable.value}</EnumValue>
        </NamedAttributeInspector>
      );
    case 'text':
      return (
        <NamedAttributeInspector name={displayableName(name)}>
          <TextValue>{inspectable.value}</TextValue>
        </NamedAttributeInspector>
      );
    case 'number':
      return (
        <NamedAttributeInspector name={displayableName(name)}>
          <NumberValue>{inspectable.value}</NumberValue>
        </NamedAttributeInspector>
      );
    case 'color':
      return (
        <ColorInspector
          name={displayableName(name)}
          color={inspectable.value}
        />
      );
    case 'size':
      return (
        <NamedAttributeInspector name={displayableName(name)}>
          <SizeInspector value={inspectable.value} />
        </NamedAttributeInspector>
      );
    case 'bounds':
      return (
        <NamedAttributeInspector name={displayableName(name)}>
          <BoundsInspector value={inspectable.value} />
        </NamedAttributeInspector>
      );
    case 'coordinate':
      return (
        <NamedAttributeInspector name={displayableName(name)}>
          <CoordinateInspector value={inspectable.value} />
        </NamedAttributeInspector>
      );
    case 'coordinate3d':
      return (
        <NamedAttributeInspector name={displayableName(name)}>
          <Coordinate3DInspector value={inspectable.value} />
        </NamedAttributeInspector>
      );
    case 'space':
      return (
        <NamedAttributeInspector name={displayableName(name)}>
          <SpaceBoxInspector value={inspectable.value} />
        </NamedAttributeInspector>
      );
    case 'unknown':
      return (
        <NamedAttributeInspector name={displayableName(name)}>
          <TextValue>{inspectable.value}</TextValue>
        </NamedAttributeInspector>
      );
    case 'array':
      return (
        <ArrayAttributeInspector
          metadata={metadata}
          name={displayableName(name)}
          items={inspectable.items}
          level={level}
        />
      );
    case 'object':
      return (
        <ObjectAttributeInspector
          metadata={metadata}
          name={displayableName(name)}
          fields={inspectable.fields}
          level={level}
        />
      );
    default:
      return (
        <NamedAttributeInspector name={displayableName(name)}>
          <TextValue>{JSON.stringify(inspectable)}</TextValue>
        </NamedAttributeInspector>
      );
  }
}

function createSection(
  mode: InspectorMode,
  metadata: Map<MetadataId, Metadata>,
  name: string,
  inspectable: InspectableObject,
) {
  const children: any[] = [];
  Object.keys(inspectable.fields).forEach((key, _index) => {
    const metadataId: number = Number(key);
    const attributeMetadata = metadata.get(metadataId);
    if (attributeMetadata && attributeMetadata.type === mode) {
      const attributeValue = inspectable.fields[metadataId];
      children.push(create(metadata, attributeMetadata.name, attributeValue));
    }
  });

  if (children.length > 0) {
    return (
      <Panel key={mode.concat(name)} title={name}>
        {...children}
      </Panel>
    );
  }
}

type InspectorMode = 'layout' | 'attribute';
type Props = {
  node: ClientNode;
  metadata: Map<MetadataId, Metadata>;
  mode: InspectorMode;
  rawEnabled?: boolean;
};
export const AttributesInspector: React.FC<Props> = ({
  node,
  metadata,
  mode,
  rawEnabled = true,
}) => {
  const keys = Object.keys(node.attributes);
  const sections = keys
    .map(function (key, _) {
      /**
       * The node top-level attributes refer to the displayable panels.
       * The panel name is obtained by querying the metadata.
       * The inspectable contains the actual attributes belonging to each panel.
       */
      const metadataId: number = Number(key);
      const sectionMetadata = metadata.get(metadataId);
      if (!sectionMetadata) {
        return;
      }
      const sectionAttributes = node.attributes[
        metadataId
      ] as InspectableObject;

      return createSection(
        mode,
        metadata,
        sectionMetadata.name,
        sectionAttributes,
      );
    })
    .filter((section) => section !== undefined);

  if (sections.length === 0) {
    return <NoData message="No data available in this section" />;
  }

  return (
    <>
      {...sections}
      {rawEnabled && (
        <Panel key="Raw" title="Raw Data" collapsed>
          <DataInspector
            data={{
              ...node,
              attributes: transform(node.attributes, metadata),
            }}
          />
        </Panel>
      )}
    </>
  );
};
