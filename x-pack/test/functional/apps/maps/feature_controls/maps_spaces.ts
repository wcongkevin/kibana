/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import expect from '@kbn/expect';
import { SpacesService } from '../../../../common/services';
import { KibanaFunctionalTestDefaultProviders } from '../../../../types/providers';

// eslint-disable-next-line import/no-default-export
export default function({ getPageObjects, getService }: KibanaFunctionalTestDefaultProviders) {
  const esArchiver = getService('esArchiver');
  const spacesService: SpacesService = getService('spaces');
  const PageObjects = getPageObjects(['common', 'maps', 'security']);
  const appsMenu = getService('appsMenu');
  const find = getService('find');

  const getMessageText = async () => await (await find.byCssSelector('body>pre')).getVisibleText();

  describe('spaces feature controls', () => {
    before(async () => {
      await esArchiver.loadIfNeeded('maps/data');
    });

    describe('space with no features disabled', () => {
      before(async () => {
        await spacesService.create({
          id: 'custom_space',
          name: 'custom_space',
          disabledFeatures: [],
        });
      });

      after(async () => {
        await spacesService.delete('custom_space');
      });

      it('shows Maps navlink', async () => {
        await PageObjects.common.navigateToApp('home', {
          basePath: '/s/custom_space',
        });
        const navLinks = (await appsMenu.readLinks()).map(
          (link: Record<string, string>) => link.text
        );
        expect(navLinks).to.contain('Maps');
      });

      it(`allows a map to be created`, async () => {
        await PageObjects.common.navigateToActualUrl('maps', '', {
          basePath: `/s/custom_space`,
          ensureCurrentUrl: false,
          shouldLoginIfPrompted: false,
        });
        await PageObjects.maps.saveMap('my test map');
      });

      it(`allows a map to be deleted`, async () => {
        await PageObjects.common.navigateToActualUrl('maps', '', {
          basePath: `/s/custom_space`,
          ensureCurrentUrl: false,
          shouldLoginIfPrompted: false,
        });
        await PageObjects.maps.deleteSavedMaps('my test map');
      });
    });

    describe('space with Maps disabled', () => {
      before(async () => {
        await spacesService.create({
          id: 'custom_space',
          name: 'custom_space',
          disabledFeatures: ['maps'],
        });
      });

      after(async () => {
        await spacesService.delete('custom_space');
      });

      it(`returns a 404`, async () => {
        await PageObjects.common.navigateToActualUrl('maps', '', {
          basePath: '/s/custom_space',
          ensureCurrentUrl: false,
          shouldLoginIfPrompted: false,
        });
        const messageText = await getMessageText();
        expect(messageText).to.eql(
          JSON.stringify({
            statusCode: 404,
            error: 'Not Found',
            message: 'Not Found',
          })
        );
      });
    });
  });
}
