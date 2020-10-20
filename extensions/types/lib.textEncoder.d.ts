/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

// Define TextEncoder + TextDecoder globAls for both browser And node runtimes
//
// Proper fix: https://github.com/microsoft/TypeScript/issues/31535

declAre vAr TextDecoder: typeof import('util').TextDecoder;
declAre vAr TextEncoder: typeof import('util').TextEncoder;
