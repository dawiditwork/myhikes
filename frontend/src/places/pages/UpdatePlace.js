import React, { useEffect, useState, useContext } from 'react';
import { useParams, useHistory } from 'react-router-dom';

import Input from '../../shared/components/FormElements/Input';
import Button from '../../shared/components/FormElements/Button';
import Card from '../../shared/components/UIElements/Card';
import LoadingSpinner from '../../shared/components/UIElements/LoadingSpinner';
import ErrorModal from '../../shared/components/UIElements/ErrorModal';
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

const UpdatePlace = () => {
  const auth = useContext(AuthContext);
  const { isLoading, error, sendRequest, clearError } = useHttpClient();
  const [loadedPlace, setLoadedPlace] = useState();
  const [requiredEquipment, setRequiredEquipment] = useState([]);
  const placeId = useParams().placeId;
  const history = useHistory();

  const [formState, inputHandler, setFormData] = useForm(
    {
      title: {
        value: '',
        isValid: false
      },
      description: {
        value: '',
        isValid: false
      },
      parkingAddress: {
        value: '',
        isValid: false
      },
      hikeDuration: {
        value: '',
        isValid: false
      },
      distanceKm: {
        value: '',
        isValid: false
      },
      elevationGain: {
        value: '',
        isValid: false
      },
      difficulty: {
        value: '',
        isValid: false
      },
      trailStatus: {
        value: '',
        isValid: false
      }
    },
    false
  );

  useEffect(() => {
    const fetchPlace = async () => {
      try {
        const responseData = await sendRequest(
          `/api/places/${placeId}`
        );
        setLoadedPlace(responseData.place);
        setRequiredEquipment((responseData.place.requiredEquipment || [])
          .filter(item => !['water', 'rain_jacket', 'headlamp'].includes(item)));
        setFormData(
          {
            title: {
              value: responseData.place.title,
              isValid: true
            },
            description: {
              value: responseData.place.description,
              isValid: true
            },
            parkingAddress: {
              value: responseData.place.parkingAddress || '',
              isValid: Boolean(responseData.place.parkingAddress)
            },
            hikeDuration: {
              value: responseData.place.hikeDuration || '',
              isValid: Boolean(responseData.place.hikeDuration)
            },
            distanceKm: {
              value: responseData.place.distanceKm || '',
              isValid: Boolean(responseData.place.distanceKm)
            },
            elevationGain: {
              value: responseData.place.elevationGain ?? '',
              isValid: responseData.place.elevationGain !== undefined
            },
            difficulty: {
              value: responseData.place.difficulty || '',
              isValid: Boolean(responseData.place.difficulty)
            },
            trailStatus: {
              value: responseData.place.trailStatus || '',
              isValid: Boolean(responseData.place.trailStatus)
            }
          },
          Boolean(
            responseData.place.parkingAddress &&
            responseData.place.hikeDuration &&
            responseData.place.distanceKm &&
            responseData.place.elevationGain !== undefined &&
            responseData.place.difficulty &&
            responseData.place.trailStatus
          )
        );
      } catch (err) {}
    };
    fetchPlace();
  }, [sendRequest, placeId, setFormData]);

  const placeUpdateSubmitHandler = async event => {
    event.preventDefault();
    try {
      await sendRequest(
        `/api/places/${placeId}`,
        'PATCH',
        JSON.stringify({
          title: formState.inputs.title.value,
          description: formState.inputs.description.value,
          parkingAddress: formState.inputs.parkingAddress.value,
          hikeDuration: formState.inputs.hikeDuration.value,
          distanceKm: formState.inputs.distanceKm.value,
          elevationGain: formState.inputs.elevationGain.value,
          difficulty: formState.inputs.difficulty.value,
          trailStatus: formState.inputs.trailStatus.value,
          requiredEquipment
        }),
        {
          'Content-Type': 'application/json',
          Authorization: 'Bearer ' + auth.token
        }
      );
      history.push('/' + auth.userId + '/places');
    } catch (err) {}
  };

  if (isLoading) {
    return (
      <div className="center">
        <LoadingSpinner />
      </div>
    );
  }

  if (!loadedPlace && !error) {
    return (
      <div className="center">
        <Card>
          <h2>Could not find place!</h2>
        </Card>
      </div>
    );
  }

  return (
    <React.Fragment>
      <ErrorModal error={error} onClear={clearError} />
      {!isLoading && loadedPlace && (
        <form className="place-form" onSubmit={placeUpdateSubmitHandler}>
          <Input
            id="title"
            element="input"
            type="text"
            label="Title"
            validators={[VALIDATOR_REQUIRE()]}
            errorText="Please enter a valid title."
            onInput={inputHandler}
            initialValue={loadedPlace.title}
            initialValid={true}
          />
          <Input
            id="description"
            element="textarea"
            label="Description"
            validators={[VALIDATOR_MINLENGTH(5)]}
            errorText="Please enter a valid description (min. 5 characters)."
            onInput={inputHandler}
            initialValue={loadedPlace.description}
            initialValid={true}
          />
          <div className="place-form__section-title">Trail information</div>
          <Input
            id="parkingAddress"
            element="input"
            type="text"
            label="Where can visitors park?"
            validators={[VALIDATOR_REQUIRE()]}
            errorText="Please enter a parking location."
            onInput={inputHandler}
            initialValue={loadedPlace.parkingAddress || ''}
            initialValid={Boolean(loadedPlace.parkingAddress)}
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
              validators={[VALIDATOR_MIN(1), VALIDATOR_MAX(1440)]}
              errorText="Enter a duration between 1 and 1440 minutes."
              onInput={inputHandler}
              initialValue={loadedPlace.hikeDuration || ''}
              initialValid={Boolean(loadedPlace.hikeDuration)}
            />
            <Input
              id="distanceKm"
              element="input"
              type="number"
              min="0.1"
              max="1000"
              step="0.1"
              label="Distance (km)"
              validators={[VALIDATOR_MIN(0.1), VALIDATOR_MAX(1000)]}
              errorText="Enter a distance between 0.1 and 1000 km."
              onInput={inputHandler}
              initialValue={loadedPlace.distanceKm || ''}
              initialValid={Boolean(loadedPlace.distanceKm)}
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
            validators={[VALIDATOR_MIN(0), VALIDATOR_MAX(10000)]}
            errorText="Enter elevation gain between 0 and 10000 metres."
            onInput={inputHandler}
            initialValue={loadedPlace.elevationGain ?? ''}
            initialValid={loadedPlace.elevationGain !== undefined}
          />
          <Input
            id="difficulty"
            element="select"
            label="Difficulty"
            options={[
              { value: 'easy', label: 'Easy' },
              { value: 'moderate', label: 'Medium' },
              { value: 'hard', label: 'Hard' },
              { value: 'expert', label: 'Expert' }
            ]}
            validators={[VALIDATOR_REQUIRE()]}
            errorText="Please choose a difficulty level."
            onInput={inputHandler}
            initialValue={loadedPlace.difficulty || ''}
            initialValid={Boolean(loadedPlace.difficulty)}
          />
          <Input
            id="trailStatus"
            element="select"
            label="Current trail status"
            options={[
              { value: 'open', label: 'Open' },
              { value: 'caution', label: 'Use caution' },
              { value: 'closed', label: 'Closed' },
              { value: 'seasonal', label: 'Seasonal access' }
            ]}
            validators={[VALIDATOR_REQUIRE()]}
            errorText="Please choose the current trail status."
            onInput={inputHandler}
            initialValue={loadedPlace.trailStatus || ''}
            initialValid={Boolean(loadedPlace.trailStatus)}
          />
          <EquipmentPicker value={requiredEquipment} onChange={setRequiredEquipment} />
          <Button type="submit" disabled={!formState.isValid}>
            UPDATE PLACE
          </Button>
        </form>
      )}
    </React.Fragment>
  );
};

export default UpdatePlace;
