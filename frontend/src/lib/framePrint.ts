export async function printHtmlInHiddenFrame(html: string): Promise<boolean> {
  const frame = document.createElement('iframe');
  frame.setAttribute('aria-hidden', 'true');
  frame.style.position = 'fixed';
  frame.style.width = '0';
  frame.style.height = '0';
  frame.style.opacity = '0';
  frame.style.pointerEvents = 'none';
  frame.style.border = '0';
  frame.style.right = '0';
  frame.style.bottom = '0';

  document.body.appendChild(frame);

  const cleanup = () => {
    if (frame.parentNode) {
      frame.parentNode.removeChild(frame);
    }
  };

  try {
    const doc = frame.contentDocument;
    const win = frame.contentWindow;
    if (!doc || !win) {
      cleanup();
      return false;
    }

    doc.open();
    doc.write(html);
    doc.close();

    await new Promise<void>((resolve) => {
      win.requestAnimationFrame(() => resolve());
    });

    await new Promise<void>((resolve) => {
      const handleAfterPrint = () => {
        win.removeEventListener('afterprint', handleAfterPrint);
        resolve();
      };

      win.addEventListener('afterprint', handleAfterPrint);
      win.focus();
      win.print();

      window.setTimeout(() => {
        win.removeEventListener('afterprint', handleAfterPrint);
        resolve();
      }, 2000);
    });

    cleanup();
    return true;
  } catch {
    cleanup();
    return false;
  }
}
