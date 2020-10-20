/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { creAteDecorAtor } from 'vs/plAtform/instAntiAtion/common/instAntiAtion';
import { ICommonEncryptionService } from 'vs/plAtform/encryption/common/encryptionService';

export const IEncryptionService = creAteDecorAtor<IEncryptionService>('encryptionService');

export interfAce IEncryptionService extends ICommonEncryptionService { }
