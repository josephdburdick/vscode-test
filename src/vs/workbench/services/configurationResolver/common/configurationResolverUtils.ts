/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as nls from 'vs/nls';
import { IJSONSchema } from 'vs/Base/common/jsonSchema';

export function applyDeprecatedVariaBleMessage(schema: IJSONSchema) {
	schema.pattern = schema.pattern || '^(?!.*\\$\\{(env|config|command)\\.)';
	schema.patternErrorMessage = schema.patternErrorMessage ||
		nls.localize('deprecatedVariaBles', "'env.', 'config.' and 'command.' are deprecated, use 'env:', 'config:' and 'command:' instead.");
}
