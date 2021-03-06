/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import { resolve } from 'path';

import { toArray } from 'rxjs/operators';

import { createFailError } from '../run';
import { findPluginSpecs } from  '../../legacy/plugin_discovery';
import { collectUiExports } from  '../../legacy/ui';
import { buildAll } from  '../../legacy/server/sass/build_all';

export async function buildSass({ log, kibanaDir }) {
  log.info('running plugin discovery in', kibanaDir);

  const scanDirs = [
    resolve(kibanaDir, 'src/legacy/core_plugins')
  ];

  const paths = [ resolve(kibanaDir, 'x-pack') ];

  const { spec$ } = findPluginSpecs({ plugins: { scanDirs, paths } });
  const enabledPlugins = await spec$.pipe(toArray()).toPromise();
  const uiExports = collectUiExports(enabledPlugins);
  log.info('found %d styleSheetPaths', uiExports.styleSheetPaths.length);
  log.verbose(uiExports.styleSheetPaths);

  let bundleCount = 0;
  try {
    const bundles = await buildAll({
      styleSheets: uiExports.styleSheetPaths,
      log,
      buildDir: resolve(kibanaDir, 'built_assets/css'),
      sourceMap: true
    });

    bundles.forEach(bundle => {
      log.debug(`Compiled SCSS: ${bundle.sourcePath} (theme=${bundle.theme})`);
    });

    bundleCount = bundles.length;
  } catch (error) {
    const { message, line, file } = error;
    throw createFailError(`${message} on line ${line} of ${file}`);
  }

  log.success('%d scss bundles created', bundleCount);
}
