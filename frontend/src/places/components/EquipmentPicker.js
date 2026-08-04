import React from 'react';

export const EQUIPMENT = [
  ['hiking_boots', '🥾', 'Good hiking boots'],
  ['poles', '🥢', 'Trekking poles'],
  ['microspikes', '⛓', 'Microspikes'],
  ['helmet', '⛑️', 'Helmet']
];

const EquipmentPicker = ({ value, onChange }) => (
  <fieldset className="equipment-picker">
    <legend>Required equipment</legend>
    <p>Select everything hikers should bring.</p>
    <div>
      {EQUIPMENT.map(([id, icon, label]) => (
        <label key={id} className={value.includes(id) ? 'active' : ''}>
          <input type="checkbox" checked={value.includes(id)} onChange={() =>
            onChange(value.includes(id) ? value.filter(item => item !== id) : [...value, id])
          } />
          <span aria-hidden="true">{icon}</span>{label}
        </label>
      ))}
    </div>
  </fieldset>
);

export default EquipmentPicker;
