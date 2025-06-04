<template>
  <div class="data-list">
    <table class="details table" v-if="!isLoading">
      <thead>
        <tr>
          <th>{{ $t('quota.details_name') }}</th>
          <th>
            {{
              countMode === 'seconds'
                ? $t('quota.details_seconds')
                : $t('quota.details_frames')
            }}
          </th>
          <th>{{ $t('quota.weight') }}</th>
        </tr>
      </thead>
      <tbody>
        <tr
          :key="`status-log-${log.id}`"
          v-for="log in statusLogs"
          :set="entity = getEntity(log)"
        >
          <td>{{ taskStatusMap.get(log.task_status_id).name }}</td>
          <td>
            <a :href="getEntityPath(log.entity_id)">{{ log.entity_id }}</a>
          </td>

          <!--td>{{ getQuota(log) }}</td>
          <td>{{ shot.weight }}</td-->
        </tr>
      </tbody>
    </table>

    <table-info :is-loading="isLoading" :is-error="isLoadingError" />
  </div>
</template>

<script>
import { mapGetters } from 'vuex'

import { frameToSeconds } from '@/lib/video'

import TableInfo from '@/components/widgets/TableInfo.vue'
import { getEntityPath } from '@/lib/path'

export default {
  name: 'status-log-list',

  components: {
    TableInfo
  },

  props: {
    statusLogs: {
      type: Array,
      default: () => []
    },
    isLoading: {
      type: Boolean,
      default: false
    },
    isLoadingError: {
      type: Boolean,
      default: false
    },
    countMode: {
      type: String,
      default: 'frames'
    }
  },

  computed: {
    ...mapGetters(['currentProduction', 'taskStatusMap', 'shotMap'])
  },

  methods: {
    getQuota(shot) {
      if (this.countMode === 'seconds') {
        return frameToSeconds(shot.nb_frames, this.currentProduction, shot)
      } else {
        return shot.nb_frames
      }
    },

    getEntity(log) {
      const entity = this.shotMap.get(log.entity_id)

      if (entity) return

      const path = getEntityPath(entity)
      console.log('entity', path)
      return path
    }
  }
}
</script>

<style lang="scss" scoped>
.dark {
  header tr:hover {
    background: transparent;
  }

  .table {
    thead,
    tbody tr:nth-child(odd) {
      color: $white-grey;
      background: #36393f;
    }

    tbody tr:nth-child(even) {
      color: $white-grey;
      background: #46494f;
    }

    thead th,
    thead:hover {
      color: $white-grey;
      background: #36393f;
      border-color: #666666;
    }

    tbody td {
      border-color: #25282e;
    }

    tbody tr:hover {
      color: $white-grey;
      background: #5e6169;
    }
  }
}

tbody {
  tr:nth-child(even) {
    background: #f6f6f6;
  }

  tr:hover {
    background: $light-green-lightest;
  }
}

.name {
  width: 300px;
}
</style>
