import { useEffect, useRef } from 'react';
import Quill from 'quill';
import 'quill/dist/quill.snow.css';

const editorModules = {
  toolbar: [
    [{ header: [1, 2, 3, false] }],
    ['bold', 'italic', 'underline'],
    [{ list: 'ordered' }, { list: 'bullet' }],
    ['blockquote'],
    ['clean'],
  ],
};

const editorFormats = [
  'header',
  'bold',
  'italic',
  'underline',
  'list',
  'bullet',
  'blockquote',
];

export default function QuillEditor({ value, onChange, placeholder, className }) {
  const containerRef = useRef(null);
  const quillRef = useRef(null);
  const isInitializedRef = useRef(false);

  // Initialize Quill only once
  useEffect(() => {
    if (isInitializedRef.current || !containerRef.current) return;

    const quill = new Quill(containerRef.current, {
      theme: 'snow',
      modules: editorModules,
      formats: editorFormats,
      placeholder,
    });

    quill.on('text-change', () => {
      if (onChange) {
        onChange(quill.root.innerHTML);
      }
    });

    if (value) {
      quill.clipboard.dangerouslyPasteHTML(value);
    }

    quillRef.current = quill;
    isInitializedRef.current = true;

    return () => {
      if (quillRef.current) {
        quillRef.current.off('text-change');
      }
    };
  }, []);

  // Handle external value changes
  useEffect(() => {
    if (!quillRef.current || !isInitializedRef.current) return;
    
    const currentContent = quillRef.current.root.innerHTML;
    const nextValue = value || '';
    
    if (currentContent !== nextValue) {
      const selection = quillRef.current.getSelection();
      quillRef.current.clipboard.dangerouslyPasteHTML(nextValue);
      if (selection) {
        quillRef.current.setSelection(selection);
      }
    }
  }, [value]);

  return (
    <div className={className}>
      <div ref={containerRef} />
    </div>
  );
}

