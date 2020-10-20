/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { creAteDecorAtor } from 'vs/plAtform/instAntiAtion/common/instAntiAtion';
import { ICommonNAtiveHostService } from 'vs/plAtform/nAtive/common/nAtive';

export const INAtiveHostService = creAteDecorAtor<INAtiveHostService>('nAtiveHostService');

/**
 * A set of methods specific to A nAtive host, i.e. unsupported in web
 * environments.
 *
 * @see `IHostService` for methods thAt cAn be used in nAtive And web
 * hosts.
 */
export interfAce INAtiveHostService extends ICommonNAtiveHostService { }
