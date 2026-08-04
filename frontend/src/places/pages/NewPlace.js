import React, { useContext, useState } from 'react';
import { useHistory } from 'react-router-dom';

import Input from '../../shared/components/FormElements/Input';
import Button from '../../shared/components/FormElements/Button';
import ErrorModal from '../../shared/components/UIElements/ErrorModal';
import LoadingSpinner from '../../shared/components/UIElements/LoadingSpinner';
import ImageUpload from '../../shared/components/FormElements/ImageUpload';
import {
  VALIDATOR_REQUIRE,
  VALIDATOR_MINLENGTH,
  VALIDATOR_MIN,
  VALIDATOR_MAX
} from '../../shared/util/validators';
import { useForm } from '../../shared/hooks/form-hook';
import { useHttpClient } from '../../shared/hooks/http-hook';
import { AuthContext } from '../../shared/context/auth-context';
import './PlaceForm.css';
import EquipmentPicker from '../components/EquipmentPicker';

const NewPlace = () => {
  const auth = useContext(AuthContext);
  const { isLoading, error, sendRequest, clearError } = useHttpClient();
  const [requiredEquipment, setRequiredEquipment] = useState([]);

  const [formState, inputHandler] = useForm(
    {
      title: { value: '', isValid: false },
      description: { value: '', isValid: false },
      address: { value: '', isValid: false },
      parkingAddress: { value: '', isValid: false },
      hikeDuration: { value: '', isValid: false },
      distanceKm: { value: '', isValid: false },
      elevationGain: { value: '', isValid: false },
      difficulty: { value: '', isValid: false },
      trailStatus: { value: '', isValid: false },
      images: { value: [], isValid: false } // 🔥 ZAMIANA
    },
    false
  );

  const history = useHistory();

  const placeSubmitHandler = async event => {
    event.preventDefault();

    try {
      const formData = new FormData();
      formData.append('title', formState.inputs.title.value);
      formData.append('description', formState.inputs.description.value);
      formData.append('address', formState.inputs.address.value);
      formData.append('parkingAddress', formState.inputs.parkingAddress.value);
      formData.append('hikeDuration', formState.inputs.hikeDuration.value);
      formData.append('distanceKm', formState.inputs.distanceKm.value);
      formData.append('elevationGain', formState.inputs.elevationGain.value);
      formData.append('difficulty', formState.inputs.difficulty.value);
      formData.append('trailStatus', formState.inputs.trailStatus.value);
      formData.append('requiredEquipment', JSON.stringify(requiredEquipment));

      // 🔥 WIELE ZDJĘĆ
      formState.inputs.images.value.forEach(file => {
        formData.append('images', file);
      });

      await sendRequest(
        '/api/places',
        'POST',
        formData,
        {
          Authorization: 'Bearer ' + auth.token
        }
      );

      history.push('/');
    } catch (err) {}
  };

  return (
    <React.Fragment>
      <ErrorModal error={error} onClear={clearError} />

      <form className="place-form" onSubmit={placeSubmitHandler}>
        {isLoading && <LoadingSpinner asOverlay />}

        <Input
          id="title"
          element="input"
          type="text"
          label="Title"
          validators={[VALIDATOR_REQUIRE()]}
          errorText="Please enter a valid title."
          onInput={inputHandler}
        />

        <Input
          id="description"
          element="textarea"
          label="Description"
          validators={[VALIDATOR_MINLENGTH(5)]}
          errorText="Please enter a valid description (at least 5 characters)."
          onInput={inputHandler}
        />

        <Input
          id="address"
          element="input"
          label="Address"
          validators={[VALIDATOR_REQUIRE()]}
          errorText="Please enter a valid address."
          onInput={inputHandler}
        />

        <div className="place-form__section-title">Trail information</div>

        <Input
          id="parkingAddress"
          element="input"
          type="text"
          label="Where can visitors park?"
          placeholder="Parking name or address"
          validators={[VALIDATOR_REQUIRE()]}
          errorText="Please enter a parking location."
          onInput={inputHandler}
        />

        <div className="place-form__row">
          <Input
            id="hikeDuration"
            element="input"
            type="number"
            min="1"
            max="1440"
            step="1"
            label="Hike duration (minutes)"
            placeholder="e.g. 180"
            validators={[VALIDATOR_MIN(1), VALIDATOR_MAX(1440)]}
            errorText="Enter a duration between 1 and 1440 minutes."
            onInput={inputHandler}
          />
          <Input
            id="distanceKm"
            element="input"
            type="number"
            min="0.1"
            max="1000"
            step="0.1"
            label="Distance (km)"
            placeholder="e.g. 12.5"
            validators={[VALIDATOR_MIN(0.1), VALIDATOR_MAX(1000)]}
            errorText="Enter a distance between 0.1 and 1000 km."
            onInput={inputHandler}
          />
        </div>

        <Input
          id="elevationGain"
          element="input"
          type="number"
          min="0"
          max="10000"
          step="1"
          label="Elevation gain (m)"
          placeholder="e.g. 850"
          validators={[VALIDATOR_MIN(0), VALIDATOR_MAX(10000)]}
          errorText="Enter elevation gain between 0 and 10000 metres."
          onInput={inputHandler}
        />

        <Input
          id="difficulty"
          element="select"
          label="Difficulty"
          placeholder="Choose difficulty"
          options={[
            { value: 'easy', label: 'Easy' },
            { value: 'moderate', label: 'Medium' },
            { value: 'hard', label: 'Hard' },
            { value: 'expert', label: 'Expert' }
          ]}
          validators={[VALIDATOR_REQUIRE()]}
          errorText="Please choose a difficulty level."
          onInput={inputHandler}
        />

        <Input
          id="trailStatus"
          element="select"
          label="Current trail status"
          placeholder="Choose trail status"
          options={[
            { value: 'open', label: 'Open' },
            { value: 'caution', label: 'Use caution' },
            { value: 'closed', label: 'Closed' },
            { value: 'seasonal', label: 'Seasonal access' }
          ]}
          validators={[VALIDATOR_REQUIRE()]}
          errorText="Please choose the current trail status."
          onInput={inputHandler}
        />

        <EquipmentPicker value={requiredEquipment} onChange={setRequiredEquipment} />

        {/* 🔥 WIELE ZDJĘĆ */}
        <ImageUpload
          id="images"
          multiple
          max={5}
          onInput={inputHandler}
          errorText="Please provide up to 5 images."
        />

        <Button type="submit" disabled={!formState.isValid}>
          ADD PLACE
        </Button>
      </form>
    </React.Fragment>
  );
};

export default NewPlace;
