<template>
  <div class="data-list">
    <table class="details table" v-if="!isLoading">
      <thead>
        <tr>
          <th>{{ $t('status-stats.details_name') }}</th>
          <th>
            {{
              countMode === 'nb_seconds'
                ? $t('status-stats.details_seconds')
                : $t('status-stats.details_frames')
            }}
          </th>
          <th>{{ $t('status-stats.details_status') }}</th>
          <th>{{ $t('status-stats.details_is_first') }}</th>
        </tr>
      </thead>
      <tbody>
        <tr :key="`status-log-${log.id}`" v-for="log in statusLogs">
          <td>
            <a @click="goToEntity(log)">{{ log.entity.name }}</a>
          </td>
          <td>
            {{ getValue(log) }}
          </td>
          <td>{{ taskStatusMap.get(log.task_status_id).name }}</td>
          <td>{{ log.is_first ? 'Yes' : 'No' }}</td>
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
      default: 'nb_frames'
    }
  },

  computed: {
    ...mapGetters([
      'currentProduction',
      'productionMap',
      'taskStatusMap',
      'shotMap'
    ])
  },

  methods: {
    getValue(log) {
      if (this.countMode === 'nb_seconds') {
        return frameToSeconds(log.entity.nb_frames, this.currentProduction, log)
      } else {
        return log.entity.nb_frames
      }
    },

    goToEntity(statusLog) {
      const project = this.productionMap.get(statusLog.project_id)
      const isTVShow = project.production_type === 'tvshow'
      let episodeId = null
      const section = 'shots'
      if (isTVShow) episodeId = statusLog.episode_id || 'main'
      const params = getEntityPath(
        statusLog.entity_id,
        statusLog.project_id,
        section,
        episodeId
      )
      console.log('params', params)
      //this.$router.push(params)
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
