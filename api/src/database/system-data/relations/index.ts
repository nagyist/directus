import type { RelationMeta } from '@directus/shared/types';
import { merge } from 'lodash-es';
import { requireYAML } from '../../../utils/require-yaml.js';

const systemData = requireYAML(require.resolve('./relations.yaml')) as {
	data: RelationMeta[];
	defaults: Partial<RelationMeta>;
};

export const systemRelationRows: RelationMeta[] = systemData.data.map((row) => {
	return merge({ system: true }, systemData.defaults, row);
});
