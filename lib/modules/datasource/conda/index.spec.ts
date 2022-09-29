import { getPkgReleases } from '..';
import { Fixtures } from '../../../../test/fixtures';
import * as httpMock from '../../../../test/http-mock';
import { EXTERNAL_HOST_ERROR } from '../../../constants/error-messages';
import { datasource, defaultRegistryUrl } from './common';
import { CondaDatasource } from './index';

const depName = 'main/pytest';
const depUrl = `/${depName}`;

describe('modules/datasource/conda/index', () => {
  describe('getReleases', () => {
    it('throws for error', async () => {
      httpMock.scope(defaultRegistryUrl).get(depUrl).replyWithError('error');
      await expect(
        getPkgReleases({
          datasource,
          depName,
        })
      ).rejects.toThrow(EXTERNAL_HOST_ERROR);
    });

    it('returns null for 404', async () => {
      httpMock.scope(defaultRegistryUrl).get(depUrl).reply(404);
      expect(
        await getPkgReleases({
          datasource,
          depName,
        })
      ).toBeNull();
    });

    it('returns null for empty result', async () => {
      httpMock.scope(defaultRegistryUrl).get(depUrl).reply(200, {});
      expect(
        await getPkgReleases({
          datasource,
          depName,
        })
      ).toBeNull();
    });

    it('throws for 5xx', async () => {
      httpMock.scope(defaultRegistryUrl).get(depUrl).reply(502);
      await expect(
        getPkgReleases({
          datasource,
          depName,
        })
      ).rejects.toThrow(EXTERNAL_HOST_ERROR);
    });

    it('processes real data', async () => {
      httpMock
        .scope(defaultRegistryUrl)
        .get(depUrl)
        .reply(200, Fixtures.get('pytest.json'));
      const res = await getPkgReleases({
        datasource,
        depName,
      });
      expect(res).toMatchSnapshot();
      expect(res?.releases).toHaveLength(94);
    });

    it('process real data without registryUrl + warning', async () => {
      httpMock
        .scope(defaultRegistryUrl)
        .get(depUrl)
        .reply(200, Fixtures.get('pytest.json'));
      const condaDatasource = new CondaDatasource();
      const res = await condaDatasource.getReleases({
        registryUrl: '',
        packageName: depName,
      });
      expect(res).toMatchSnapshot();
      expect(res?.releases).toHaveLength(94);
    });

    it('supports multiple custom datasource urls', async () => {
      const depName = 'pytest';
      httpMock
        .scope('https://api.anaconda.org/package/rapids')
        .get(`/${depName}`)
        .reply(404);
      //.replyWithError('error');
      httpMock
        .scope('https://api.anaconda.org/package/conda-forge')
        .get(`/${depName}`)
        .reply(200, Fixtures.get('pytest.json'));
      const config = {
        registryUrls: [
          'https://api.anaconda.org/package/rapids',
          'https://api.anaconda.org/package/conda-forge',
          'https://api.anaconda.org/package/nvidia',
        ],
      };
      const res = await getPkgReleases({
        ...config,
        datasource,
        depName: depName,
      });
      expect(res).toMatchSnapshot();
      expect(res?.releases).toHaveLength(94);
    });
  });
});
