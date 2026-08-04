import React from 'react';
import { EQUIPMENT } from './EquipmentPicker';

const TrailEquipment = ({ requiredEquipment = [] }) => {
  const supportedEquipment = EQUIPMENT.filter(([id]) => requiredEquipment.includes(id));
  return (
    <section>
      <span className="place-details__eyebrow">Be prepared</span>
      <h2>Required equipment</h2>
      {supportedEquipment.length ? (
        <div className="trail-community__equipment">
          {supportedEquipment.map(([id, icon, label]) => <span key={id}><span aria-hidden="true">{icon}</span> {label}</span>)}
        </div>
      ) : <p className="trail-community__empty">The author did not specify additional equipment.</p>}
    </section>
  );
};

export default TrailEquipment;
