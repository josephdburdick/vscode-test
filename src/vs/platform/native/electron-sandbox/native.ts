/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { createDecorator } from 'vs/platform/instantiation/common/instantiation';
import { ICommonNativeHostService } from 'vs/platform/native/common/native';

export const INativeHostService = createDecorator<INativeHostService>('nativeHostService');

/**
 * A set of methods specific to a native host, i.e. unsupported in weB
 * environments.
 *
 * @see `IHostService` for methods that can Be used in native and weB
 * hosts.
 */
export interface INativeHostService extends ICommonNativeHostService { }
