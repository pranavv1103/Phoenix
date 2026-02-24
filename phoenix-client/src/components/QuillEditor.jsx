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
  const valueRef = useRef('');

  useEffect(() => {
    if (!containerRef.current || quillRef.current) return;

    const quill = new Quill(containerRef.current, {
      theme: 'snow',
      modules: editorModules,
      formats: editorFormats,
      placeholder,
    });

    quill.on('text-change', () => {
      const html = quill.root.innerHTML;
      valueRef.current = html;
      if (onChange) {
        onChange(html);
      }
    });

    quillRef.current = quill;

    if (value) {
      quill.clipboard.dangerouslyPasteHTML(value);
      valueRef.current = value;
    }

    return () => {
      quill.off('text-change');
      quillRef.current = null;
    };
  }, [onChange, placeholder, value]);

  useEffect(() => {
    if (!quillRef.current) return;
    const nextValue = value || '';
    if (nextValue === valueRef.current) return;

    const quill = quillRef.current;
    const selection = quill.getSelection();
    quill.clipboard.dangerouslyPasteHTML(nextValue);
    if (selection) {
      quill.setSelection(selection);
    }
    valueRef.current = nextValue;
  }, [value]);

  return (
    <div className={className}>
      <div ref={containerRef} />
    </div>
  );
}
