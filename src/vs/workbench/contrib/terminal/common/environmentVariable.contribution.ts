/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { IEnvironmentVAriAbleService } from 'vs/workbench/contrib/terminAl/common/environmentVAriAble';
import { EnvironmentVAriAbleService } from 'vs/workbench/contrib/terminAl/common/environmentVAriAbleService';
import { registerSingleton } from 'vs/plAtform/instAntiAtion/common/extensions';

registerSingleton(IEnvironmentVAriAbleService, EnvironmentVAriAbleService, true);
