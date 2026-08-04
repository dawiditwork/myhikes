import React, { useRef, useState, useEffect } from 'react';
import Button from './Button';
import './ImageUpload.css';

const ImageUpload = props => {
  const maxFiles = props.max || (props.multiple ? 5 : 1);

  const [files, setFiles] = useState([]);
  const [previewUrls, setPreviewUrls] = useState([]);
  const [isValid, setIsValid] = useState(false);

  const filePickerRef = useRef();

  // Generuj preview
  useEffect(() => {
    if (!files || files.length === 0) {
      setPreviewUrls([]);
      setIsValid(false);
      props.onInput(props.id, props.multiple ? [] : null, false);
      return;
    }

    let isCancelled = false;
    const readers = [];
    const nextPreviews = [];

    files.forEach(file => {
      const reader = new FileReader();
      readers.push(reader);

      reader.onload = () => {
        nextPreviews.push(reader.result);

        if (!isCancelled && nextPreviews.length === files.length) {
          setPreviewUrls(nextPreviews);
        }
      };

      reader.readAsDataURL(file);
    });

    setIsValid(true);
    props.onInput(props.id, props.multiple ? files : files[0], true);

    return () => {
      isCancelled = true;
      readers.forEach(r => r.abort());
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [files]);

  const openFilePicker = () => {
    filePickerRef.current.click();
  };

  // Dodawanie plików (doklejanie do już wybranych)
  const pickedHandler = event => {
    if (!event.target.files || event.target.files.length === 0) {
      return;
    }

    const incoming = Array.from(event.target.files);

    setFiles(prev => {
      let combined;

      if (props.multiple) {
        // doklej nowe, ale max = 5
        combined = [...prev, ...incoming].slice(0, maxFiles);
      } else {
        // single: bierz tylko pierwsze
        combined = [incoming[0]];
      }

      return combined;
    });

    // 🔥 ważne: reset inputa, żeby można było wybrać TEN SAM plik ponownie
    event.target.value = '';
  };

  const removeImageHandler = indexToRemove => {
    setFiles(prev => prev.filter((_, i) => i !== indexToRemove));
  };

  const clearAllHandler = () => {
    setFiles([]);
    setPreviewUrls([]);
    setIsValid(false);
    props.onInput(props.id, props.multiple ? [] : null, false);
  };

  return (
    <div className="form-control">
      <input
        id={props.id}
        ref={filePickerRef}
        style={{ display: 'none' }}
        type="file"
        accept=".jpg,.jpeg,.png"
        multiple={props.multiple}
        onChange={pickedHandler}
      />

      <div className={`image-upload ${props.center ? 'center' : ''}`}>
        <div className={`image-upload__preview-grid ${props.multiple ? '' : 'single'}`}>
          {previewUrls.length === 0 && (
            <p className="image-upload__hint">
              <strong>{props.multiple ? 'Photos' : 'Profile photo'}</strong>
              <span>
                {props.multiple
                  ? `Up to ${maxFiles} JPG or PNG files`
                  : 'JPG or PNG file'}
              </span>
            </p>
          )}

          {previewUrls.map((src, index) => (
            <div key={index} className="image-upload__preview">
              <img src={src} alt={`Preview ${index + 1}`} />
              <button
                type="button"
                className="image-upload__remove"
                onClick={() => removeImageHandler(index)}
                aria-label="Remove image"
                title="Remove"
              >
                ×
              </button>
            </div>
          ))}
        </div>

        <div className="image-upload__actions">
          <Button className="image-upload__button" type="button" onClick={openFilePicker}>
            <span aria-hidden="true">+</span>
            {props.multiple ? 'Choose photos' : 'Choose photo'}
          </Button>

          {previewUrls.length > 0 && (
            <button type="button" className="image-upload__clear" onClick={clearAllHandler}>
              Clear
            </button>
          )}

          {props.multiple && (
            <div className="image-upload__counter">
              {files.length}/{maxFiles}
            </div>
          )}
        </div>
      </div>

      {!isValid && <p className="image-upload__error">{props.errorText}</p>}
    </div>
  );
};

export default ImageUpload;
