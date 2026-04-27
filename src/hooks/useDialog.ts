import { useState, useCallback } from 'react';

// Simple hook to replace Alert.alert with inline state that can be rendered
// in a Modal or shown as inline UI — no native Alert popups

type DialogState = {
  visible: boolean;
  title?: string;
  message: string;
  resolve?: (ok: boolean) => void;
};

export function useDialog() {
  const [dialog, setDialog] = useState<DialogState>({ visible: false, message: '' });

  const confirm = useCallback((message: string, title?: string): Promise<boolean> => {
    return new Promise(resolve => {
      setDialog({ visible: true, message, title, resolve });
    });
  }, []);

  const alert = useCallback((message: string, title?: string) => {
    return new Promise<void>(resolve => {
      setDialog({
        visible: true, message, title,
        resolve: () => { resolve(); },
      });
    });
  }, []);

  const dismiss = useCallback((ok: boolean) => {
    dialog.resolve?.(ok);
    setDialog({ visible: false, message: '' });
  }, [dialog]);

  return { confirm, alert, dialog, dismiss };
}
