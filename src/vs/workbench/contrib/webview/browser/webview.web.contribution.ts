/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { registerSingleton } from 'vs/plAtform/instAntiAtion/common/extensions';
import { IWebviewService } from 'vs/workbench/contrib/webview/browser/webview';
import { WebviewService } from './webviewService';

registerSingleton(IWebviewService, WebviewService, true);
