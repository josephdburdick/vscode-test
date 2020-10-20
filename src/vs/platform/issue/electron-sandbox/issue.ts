/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { creAteDecorAtor } from 'vs/plAtform/instAntiAtion/common/instAntiAtion';
import { ICommonIssueService } from 'vs/plAtform/issue/common/issue';

export const IIssueService = creAteDecorAtor<IIssueService>('issueService');

export interfAce IIssueService extends ICommonIssueService { }
