import { IPermission } from '../../../../../types/permissions';
import { getBrowserScreenSize } from '../../../../utils/device-characteristics-telemetry';

export function setConsentedStatus(tokenPresent: any, permissions: IPermission[], consentedScopes: string[]) {
  if (tokenPresent) {
    if (permissions && permissions.length > 0) {
      permissions.forEach((permission: IPermission) => {
        permission.consented = (consentedScopes && consentedScopes.length > 0 &&
          consentedScopes.indexOf(permission.value) !== -1);
      });
    }
  }
}

interface IDescriptionSize {
  minWidth: number;
  maxWidth: number;
}
export function setDescriptionColumnSize(): IDescriptionSize {
  const browserSize = getBrowserScreenSize(window.innerWidth);
  switch (browserSize) {
    case 's':
      return {
        minWidth: 90,
        maxWidth: 140
      }
    case 'm':
      return {
        minWidth: 140,
        maxWidth: 190
      }
    case 'l':
      return {
        minWidth: 190,
        maxWidth: 240
      }
    case 'xl':
      return {
        minWidth: 240,
        maxWidth: 370
      }
    case 'xxl':
      return {
        minWidth: 370,
        maxWidth: 420
      }
    case 'xxxl':
      return {
        minWidth: 490,
        maxWidth: 550
      }
    case 'xxxxl':
      return {
        minWidth: 500,
        maxWidth: 1000
      }
    default:
      return {
        minWidth: 190,
        maxWidth: 250
      }
  }
}