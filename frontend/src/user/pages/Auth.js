import React, { useState, useContext } from 'react';

import Card from '../../shared/components/UIElements/Card';
import Input from '../../shared/components/FormElements/Input';
import Button from '../../shared/components/FormElements/Button';
import ErrorModal from '../../shared/components/UIElements/ErrorModal';
import LoadingSpinner from '../../shared/components/UIElements/LoadingSpinner';
import ImageUpload from '../../shared/components/FormElements/ImageUpload';
import {
  VALIDATOR_EMAIL,
  VALIDATOR_MINLENGTH,
  VALIDATOR_REQUIRE
} from '../../shared/util/validators';
import { useForm } from '../../shared/hooks/form-hook';
import { useHttpClient } from '../../shared/hooks/http-hook';
import { AuthContext } from '../../shared/context/auth-context';
import './Auth.css';

const Auth = () => {
  const auth = useContext(AuthContext);
  const [isLoginMode, setIsLoginMode] = useState(true);
  const [verificationEmail, setVerificationEmail] = useState('');
  const [verificationMessage, setVerificationMessage] = useState('');
  const { isLoading, error, sendRequest, clearError } = useHttpClient();

  const [formState, inputHandler, setFormData] = useForm(
    {
      email: { value: '', isValid: false },
      password: { value: '', isValid: false }
    },
    false
  );

  const switchModeHandler = () => {
    setVerificationMessage('');
    if (!isLoginMode) {
      setFormData(
        {
          ...formState.inputs,
          name: undefined,
          image: undefined
        },
        formState.inputs.email.isValid && formState.inputs.password.isValid
      );
    } else {
      setFormData(
        {
          ...formState.inputs,
          name: { value: '', isValid: false },
          image: { value: null, isValid: false }
        },
        false
      );
    }
    setIsLoginMode(prevMode => !prevMode);
  };

  const authSubmitHandler = async event => {
    event.preventDefault();

    if (isLoginMode) {
      // LOGIN
      try {
        const responseData = await sendRequest(
          '/api/users/login',
          'POST',
          JSON.stringify({
            email: formState.inputs.email.value,
            password: formState.inputs.password.value
          }),
          { 'Content-Type': 'application/json' }
        );
        auth.login(responseData.userId, responseData.token);
      } catch (err) {
        if (/verify your email/i.test(err.message)) {
          setVerificationEmail(formState.inputs.email.value.trim());
        }
        console.error('Login error:', err);
      }
    } else {
      // SIGNUP
      try {
        console.log('Image file being uploaded:', formState.inputs.image.value);

        const formData = new FormData();
        formData.append('email', formState.inputs.email.value);
        formData.append('name', formState.inputs.name.value);
        formData.append('password', formState.inputs.password.value);

        if (formState.inputs.image.value) {
          formData.append('image', formState.inputs.image.value);
        }

        const responseData = await sendRequest(
          '/api/users/signup',
          'POST',
          formData
        );

        setVerificationEmail(responseData.email);
        setVerificationMessage(responseData.message);
      } catch (err) {
        console.error('Signup error:', err);
      }
    }
  };

  const resendVerificationHandler = async () => {
    if (!verificationEmail) return;
    try {
      const responseData = await sendRequest(
        '/api/users/resend-verification',
        'POST',
        JSON.stringify({ email: verificationEmail }),
        { 'Content-Type': 'application/json' }
      );
      setVerificationMessage(responseData.message);
    } catch (err) {
      console.error('Verification resend error:', err);
    }
  };

  return (
    <React.Fragment>
      <ErrorModal error={error} onClear={clearError} />
      <Card className="authentication">
        {isLoading && <LoadingSpinner asOverlay />}
        <h2>Login Required</h2>
        <hr />
        {verificationMessage && (
          <div className="authentication__verification" role="status">
            <strong>Check your inbox</strong>
            <p>{verificationMessage}</p>
          </div>
        )}
        <form onSubmit={authSubmitHandler}>
          {!isLoginMode && (
            <Input
              element="input"
              id="name"
              type="text"
              label="Your Name"
              validators={[VALIDATOR_REQUIRE()]}
              errorText="Please enter a name."
              onInput={inputHandler}
            />
          )}
          {!isLoginMode && (
            <ImageUpload
              center
              id="image"
              onInput={inputHandler}
              errorText="Please provide an image."
            />
          )}
          <Input
            element="input"
            id="email"
            type="email"
            label="E-Mail"
            validators={[VALIDATOR_EMAIL()]}
            errorText="Please enter a valid email address."
            onInput={inputHandler}
          />
          <Input
            element="input"
            id="password"
            type="password"
            label="Password"
            validators={[VALIDATOR_MINLENGTH(isLoginMode ? 6 : 8)]}
            errorText={`Please enter a valid password, at least ${isLoginMode ? 6 : 8} characters.`}
            onInput={inputHandler}
          />
          <Button type="submit" disabled={!formState.isValid}>
            {isLoginMode ? 'LOGIN' : 'SIGNUP'}
          </Button>
        </form>
        <Button inverse onClick={switchModeHandler}>
          SWITCH TO {isLoginMode ? 'SIGNUP' : 'LOGIN'}
        </Button>
        {verificationEmail && (
          <button
            className="authentication__resend"
            type="button"
            onClick={resendVerificationHandler}
            disabled={isLoading}
          >
            Resend verification email
          </button>
        )}
      </Card>
    </React.Fragment>
  );
};

export default Auth;
