import { BlockSuiteError } from '@blocksuite/global/exceptions';

// more than 100% due to the shadow
const leaveTranslateDown = `translateY(calc(100% + 10px))`;
const leaveTranslateUp = `translateY(calc(-100% - 10px))`;

export interface MenuPopper<T extends HTMLElement> {
  element: T;
  dispose: () => void;
  cancel?: () => void;
}

// store active poppers
const popMap = new WeakMap<HTMLElement, Map<string, MenuPopper<HTMLElement>>>();

function animateEnter(el: HTMLElement) {
  el.style.transform = 'translateY(0)';
}
function animateLeave(el: HTMLElement, transform: string) {
  el.style.transform = transform;
}

export function createPopper<T extends keyof HTMLElementTagNameMap>(
  tagName: T,
  reference: HTMLElement,
  options?: {
    /** transition duration in ms */
    duration?: number;
    onDispose?: () => void;
    setProps?: (ele: HTMLElementTagNameMap[T]) => void;
    placement?: 'top' | 'bottom';
  }
): MenuPopper<HTMLElementTagNameMap[T]> {
  const duration = options?.duration ?? 230;
  const placement = options?.placement ?? 'top';
  const hideTransform =
    placement === 'top' ? leaveTranslateDown : leaveTranslateUp;

  if (!popMap.has(reference)) popMap.set(reference, new Map());
  const elMap = popMap.get(reference);
  // if there is already a popper, cancel leave transition and apply enter transition
  if (elMap && elMap.has(tagName)) {
    const popper = elMap.get(tagName);
    if (popper) {
      popper.cancel?.();
      requestAnimationFrame(() => animateEnter(popper.element));
      return popper as MenuPopper<HTMLElementTagNameMap[T]>;
    }
  }

  const clipWrapper = document.createElement('div');
  const menu = document.createElement(tagName);
  options?.setProps?.(menu);
  clipWrapper.append(menu);
  if (!reference.shadowRoot) {
    throw new BlockSuiteError(
      BlockSuiteError.ErrorCode.ValueNotExists,
      'reference must be a shadow root'
    );
  }
  reference.shadowRoot.append(clipWrapper);

  // apply enter transition
  menu.style.transition = `all ${duration}ms ease`;
  animateLeave(menu, hideTransform);
  requestAnimationFrame(() => animateEnter(menu));

  Object.assign(clipWrapper.style, {
    height: '100px',
    pointerEvents: 'none',
    position: 'absolute',
    overflow: 'hidden',
    width: '100%',
    maxWidth: '100%',
    boxSizing: 'border-box',
    left: '0px',
    bottom: placement === 'top' ? '100%' : 'auto',
    top: placement === 'top' ? 'auto' : '100%',
    display: 'flex',
    alignItems: placement === 'top' ? 'end' : 'start',
  });

  Object.assign(menu.style, {
    width: '100%',
    marginLeft: '30px',
    maxWidth: 'calc(100% - 60px)',
    bottom: placement === 'top' ? '0%' : 'auto',
    top: placement === 'top' ? 'auto' : '0%',
    pointerEvents: 'auto',
  });
  const remove = () => {
    clipWrapper.remove();
    menu.remove();
    popMap.get(reference)?.delete(tagName);
    options?.onDispose?.();
  };

  const popper: MenuPopper<HTMLElementTagNameMap[T]> = {
    element: menu,
    dispose: () => {
      // apply leave transition
      animateLeave(menu, hideTransform);
      menu.addEventListener('transitionend', remove, { once: true });
      popper.cancel = () => menu.removeEventListener('transitionend', remove);
    },
  };

  popMap.get(reference)?.set(tagName, popper);
  return popper;
}
