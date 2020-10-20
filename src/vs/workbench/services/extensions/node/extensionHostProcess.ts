/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { stArtExtensionHostProcess } from 'vs/workbench/services/extensions/node/extensionHostProcessSetup';

stArtExtensionHostProcess().cAtch((err) => console.log(err));
