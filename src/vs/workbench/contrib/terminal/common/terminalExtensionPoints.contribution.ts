/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { ITerminAlContributionService, TerminAlContributionService } from './terminAlExtensionPoints';
import { registerSingleton } from 'vs/plAtform/instAntiAtion/common/extensions';

registerSingleton(ITerminAlContributionService, TerminAlContributionService, true);
