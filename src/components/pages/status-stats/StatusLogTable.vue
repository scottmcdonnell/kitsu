<template>
  <div class="data-list">
    <!-- Search and Filter Controls -->
    <div class="table-controls flexrow mb1">
      <span class="filler"></span>
      <button-simple
        class="flexrow-item"
        icon="export"
        :title="$t('main.csv.export_file')"
        @click="exportToCsv"
      />
    </div>

    <!-- Data Table -->
    <div class="datatable-wrapper" ref="tableWrapper">
      <table class="datatable">
        <thead class="datatable-head">
          <tr>
            <th class="sortable" @click="toggleSort('created_at')">
              <div class="flexrow">
                <span class="flexrow-item">Date</span>
                <span class="flexrow-item ml05">
                  <span
                    v-if="
                      sortColumn === 'created_at' && sortDirection === 'asc'
                    "
                    >↑</span
                  >
                  <span
                    v-else-if="
                      sortColumn === 'created_at' && sortDirection === 'desc'
                    "
                    >↓</span
                  >
                  <span v-else>↕</span>
                </span>
              </div>
            </th>
            <th class="sortable" @click="toggleSort('person_id')">
              <div class="flexrow">
                <span class="flexrow-item">Person</span>
                <span class="flexrow-item ml05">
                  <span
                    v-if="sortColumn === 'person_id' && sortDirection === 'asc'"
                    >↑</span
                  >
                  <span
                    v-else-if="
                      sortColumn === 'person_id' && sortDirection === 'desc'
                    "
                    >↓</span
                  >
                  <span v-else>↕</span>
                </span>
              </div>
            </th>
            <th class="sortable" @click="toggleSort('task_status_id')">
              <div class="flexrow">
                <span class="flexrow-item">Status</span>
                <span class="flexrow-item ml05">
                  <span
                    v-if="
                      sortColumn === 'task_status_id' && sortDirection === 'asc'
                    "
                    >↑</span
                  >
                  <span
                    v-else-if="
                      sortColumn === 'task_status_id' &&
                      sortDirection === 'desc'
                    "
                    >↓</span
                  >
                  <span v-else>↕</span>
                </span>
              </div>
            </th>
            <th class="sortable" @click="toggleSort('task_type_id')">
              <div class="flexrow">
                <span class="flexrow-item">Task Type</span>
                <span class="flexrow-item ml05">
                  <span
                    v-if="
                      sortColumn === 'task_type_id' && sortDirection === 'asc'
                    "
                    >↑</span
                  >
                  <span
                    v-else-if="
                      sortColumn === 'task_type_id' && sortDirection === 'desc'
                    "
                    >↓</span
                  >
                  <span v-else>↕</span>
                </span>
              </div>
            </th>
            <th class="sortable" @click="toggleSort('project_id')">
              <div class="flexrow">
                <span class="flexrow-item">Project</span>
                <span class="flexrow-item ml05">
                  <span
                    v-if="
                      sortColumn === 'project_id' && sortDirection === 'asc'
                    "
                    >↑</span
                  >
                  <span
                    v-else-if="
                      sortColumn === 'project_id' && sortDirection === 'desc'
                    "
                    >↓</span
                  >
                  <span v-else>↕</span>
                </span>
              </div>
            </th>
            <th class="sortable" @click="toggleSort('episode_id')">
              <div class="flexrow">
                <span class="flexrow-item">Episode</span>
                <span class="flexrow-item ml05">
                  <span
                    v-if="
                      sortColumn === 'episode_id' && sortDirection === 'asc'
                    "
                    >↑</span
                  >
                  <span
                    v-else-if="
                      sortColumn === 'episode_id' && sortDirection === 'desc'
                    "
                    >↓</span
                  >
                  <span v-else>↕</span>
                </span>
              </div>
            </th>
            <th class="sortable" @click="toggleSort('is_first')">
              <div class="flexrow">
                <span class="flexrow-item">First Take</span>
                <span class="flexrow-item ml05">
                  <span
                    v-if="sortColumn === 'is_first' && sortDirection === 'asc'"
                    >↑</span
                  >
                  <span
                    v-else-if="
                      sortColumn === 'is_first' && sortDirection === 'desc'
                    "
                    >↓</span
                  >
                  <span v-else>↕</span>
                </span>
              </div>
            </th>
          </tr>
        </thead>
        <tbody class="datatable-body" v-if="!isLoading">
          <tr v-for="log in paginatedData" :key="log.id" class="datatable-row">
            <td>
              {{ formatFullDate(log.created_at) }}
            </td>
            <td>
              <div class="flexrow">
                <people-avatar
                  class="flexrow-item mr1"
                  :person="personMap.get(log.person_id)"
                  :size="25"
                />
                <span class="flexrow-item">{{
                  getPersonName(log.person_id)
                }}</span>
              </div>
            </td>
            <td>
              <span
                class="status-cell"
                :style="getStatusStyle(log.task_status_id)"
              >
                {{ getStatusName(log.task_status_id) }}
              </span>
            </td>
            <td>
              {{ getTaskTypeName(log.task_type_id) }}
            </td>
            <td>
              {{ getProjectName(log.project_id) }}
            </td>
            <td>
              {{ getEpisodeName(log.episode_id) }}
            </td>
            <td>
              <check-icon v-if="log.is_first" class="check-icon" />
              <x-icon v-else class="close-icon" />
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Pagination -->
    <div
      class="table-pagination flexrow mt1"
      v-if="!isLoading && statusLogs.length > 0"
    >
      <div class="flexrow-item">
        <span class="pagination-info">
          {{ $t('main.showing') }} {{ (currentPage - 1) * pageSize + 1 }}
          {{ $t('main.to') }}
          {{ Math.min(currentPage * pageSize, filteredData.length) }}
          {{ $t('main.of') }} {{ filteredData.length }} {{ $t('main.entries') }}
        </span>
      </div>
      <span class="filler"></span>
      <div class="flexrow-item">
        <button-simple
          :text="$t('main.previous')"
          :disabled="currentPage <= 1"
          @click="currentPage--"
        />
        <button-simple
          :text="$t('main.next')"
          :disabled="currentPage >= totalPages"
          @click="currentPage++"
        />
      </div>
    </div>

    <table-info :is-loading="isLoading" :is-error="isError" />

    <div
      class="has-text-centered empty-quota"
      v-if="statusLogs.length === 0 && !isLoading"
    >
      <p class="info">{{ $t('main.no_data') }}</p>
    </div>
  </div>
</template>

<script>
import { formatDate, formatFullDate } from '@/lib/time'
import { mapGetters, mapActions } from 'vuex'
import { XIcon, CheckIcon } from 'lucide-vue-next'

import csv from '@/lib/csv'
import { getDateBoundaries } from '@/lib/time'

import ButtonSimple from '@/components/widgets/ButtonSimple.vue'
import PeopleAvatar from '@/components/widgets/PeopleAvatar.vue'
import TableInfo from '@/components/widgets/TableInfo.vue'

export default {
  name: 'status-log-table',

  components: {
    ButtonSimple,
    PeopleAvatar,
    TableInfo,
    XIcon,
    CheckIcon
  },

  props: {
    taskStatusIds: {
      type: Array,
      required: true
    },
    taskTypeId: {
      type: String,
      required: false
    },
    personId: {
      type: String,
      required: false
    },
    detailLevel: {
      type: String,
      required: true
    },
    countMode: {
      type: String,
      required: true
    },
    userMode: {
      type: String,
      required: true
    },
    year: {
      type: Number,
      default: 0
    },
    month: {
      type: Number,
      default: 0
    },
    week: {
      type: Number,
      default: 0
    },
    day: {
      type: Number,
      default: 0
    },
    searchText: {
      type: String,
      default: ''
    },
    maxStat: {
      type: Number,
      default: 0
    }
  },

  data() {
    return {
      isLoading: true,
      isError: false,
      statusLogs: [],
      sortColumn: 'created_at',
      sortDirection: 'asc',
      currentPage: 1,
      pageSize: 50,
      totalPages: 1
    }
  },

  computed: {
    ...mapGetters([
      'currentProduction',
      'personMap',
      'taskStatusMap',
      'taskTypeMap',
      'episodeMap',
      'productionMap'
    ]),

    filteredData() {
      let filtered = this.statusLogs

      // Apply task status filter from props
      if (this.taskStatusIds.length > 0) {
        filtered = filtered.filter(log =>
          this.taskStatusIds.includes(log.task_status_id)
        )
      }

      // Apply person filter from props
      if (this.personId) {
        filtered = filtered.filter(log => log.person_id === this.personId)
      }

      // Apply global search filter from props
      if (this.searchText) {
        const searchTerm = this.searchText.toLowerCase()
        filtered = filtered.filter(log => {
          const person = this.personMap.get(log.person_id)
          const status = this.taskStatusMap.get(log.task_status_id)
          const taskType = this.taskTypeMap.get(log.task_type_id)
          const project = this.productionMap.get(log.project_id)
          const episode = this.episodeMap.get(log.episode_id)

          return (
            (person && person.full_name.toLowerCase().includes(searchTerm)) ||
            (status && status.name.toLowerCase().includes(searchTerm)) ||
            (taskType && taskType.name.toLowerCase().includes(searchTerm)) ||
            (project && project.name.toLowerCase().includes(searchTerm)) ||
            (episode && episode.name.toLowerCase().includes(searchTerm)) ||
            formatDate(log.created_at).includes(searchTerm)
          )
        })
      }

      // Apply sorting
      if (this.sortColumn) {
        filtered.sort((a, b) => {
          let aValue, bValue

          switch (this.sortColumn) {
            case 'created_at':
              aValue = new Date(a.created_at)
              bValue = new Date(b.created_at)
              break
            case 'person_id':
              aValue = this.getPersonName(a.person_id).toLowerCase()
              bValue = this.getPersonName(b.person_id).toLowerCase()
              break
            case 'task_status_id':
              aValue = this.getStatusName(a.task_status_id).toLowerCase()
              bValue = this.getStatusName(b.task_status_id).toLowerCase()
              break
            case 'task_type_id':
              aValue = this.getTaskTypeName(a.task_type_id).toLowerCase()
              bValue = this.getTaskTypeName(b.task_type_id).toLowerCase()
              break
            case 'project_id':
              aValue = this.getProjectName(a.project_id).toLowerCase()
              bValue = this.getProjectName(b.project_id).toLowerCase()
              break
            case 'episode_id':
              aValue = this.getEpisodeName(a.episode_id).toLowerCase()
              bValue = this.getEpisodeName(b.episode_id).toLowerCase()
              break
            case 'is_first':
              aValue = a.is_first ? 1 : 0
              bValue = b.is_first ? 1 : 0
              break
            default:
              aValue = a[this.sortColumn]
              bValue = b[this.sortColumn]
          }

          if (aValue < bValue) return this.sortDirection === 'asc' ? -1 : 1
          if (aValue > bValue) return this.sortDirection === 'asc' ? 1 : -1
          return 0
        })
      }

      return filtered
    },

    paginatedData() {
      const start = (this.currentPage - 1) * this.pageSize
      const end = start + this.pageSize
      return this.filteredData.slice(start, end)
    }
  },

  mounted() {
    this.loadData()
  },

  methods: {
    ...mapActions(['getStatusLogs']),

    formatFullDate,
    formatDate,

    initializeTable() {
      this.totalPages = Math.ceil(this.filteredData.length / this.pageSize)
    },

    // Helper methods for template
    getPersonName(personId) {
      const person = this.personMap.get(personId)
      return person ? person.full_name : personId
    },

    getStatusName(statusId) {
      const status = this.taskStatusMap.get(statusId)
      return status ? status.short_name : statusId
    },

    getStatusStyle(statusId) {
      const status = this.taskStatusMap.get(statusId)
      return status
        ? {
            backgroundColor: status.color,
            color: '#fff',
            padding: '0.25rem 0.5rem',
            borderRadius: '0.25rem',
            fontSize: '0.75rem',
            fontWeight: 'bold'
          }
        : {}
    },

    getTaskTypeName(taskTypeId) {
      const taskType = this.taskTypeMap.get(taskTypeId)
      return taskType ? taskType.name : taskTypeId
    },

    getProjectName(projectId) {
      const project = this.productionMap.get(projectId)
      return project ? project.name : projectId
    },

    getEpisodeName(episodeId) {
      if (!episodeId) return '-'
      const episode = this.episodeMap.get(episodeId)
      return episode ? episode.name : episodeId
    },

    async loadData() {
      if (!this.taskTypeId && !this.personId) return

      try {
        this.isLoading = true
        this.isError = false

        const year = this.year
        const month = this.detailLevel === 'month' ? this.month : null
        const { from, to } = getDateBoundaries(year, month)

        const logs = await this.getStatusLogs({
          taskTypeId: this.taskTypeId,
          taskStatusIds: this.taskStatusIds,
          personId: this.personId,
          detailLevel: this.detailLevel,
          countMode: this.countMode,
          userMode: this.userMode,
          from,
          to
        })

        this.statusLogs = logs || []
        this.initializeTable()
      } catch (error) {
        console.error('Error loading status logs:', error)
        this.isError = true
        this.statusLogs = []
      } finally {
        this.isLoading = false
      }
    },

    exportToCsv() {
      const headers = [
        'Date',
        'Person',
        'Status',
        'Task Type',
        'Project',
        'Episode',
        'First Take'
      ]

      const csvData = [headers]

      this.filteredData.forEach(log => {
        const person = this.personMap.get(log.person_id)
        const status = this.taskStatusMap.get(log.task_status_id)
        const taskType = this.taskTypeMap.get(log.task_type_id)
        const project = this.productionMap.get(log.project_id)
        const episode = this.episodeMap.get(log.episode_id)

        csvData.push([
          formatFullDate(log.created_at),
          person ? person.full_name : log.person_id,
          status ? status.name : log.task_status_id,
          taskType ? taskType.name : log.task_type_id,
          project ? project.name : log.project_id,
          episode ? episode.name : log.episode_id || '',
          log.is_first ? 'Yes' : 'No'
        ])
      })

      const nameData = [
        formatDate(new Date()),
        this.currentProduction.name,
        'status-logs'
      ]

      const fileName = nameData
        .join('_')
        .replace(/[^a-z0-9]/gi, '_')
        .toLowerCase()
      csv.buildCsvFile(fileName, csvData)
    },

    toggleSort(column) {
      if (this.sortColumn === column) {
        this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc'
      } else {
        this.sortColumn = column
        this.sortDirection = 'asc'
      }
      this.currentPage = 1
      this.initializeTable()
    }
  },

  watch: {
    taskTypeId() {
      this.loadData()
    },
    personId() {
      this.loadData()
    },
    taskStatusIds: {
      handler() {
        this.loadData()
      },
      deep: true
    },
    detailLevel() {
      this.loadData()
    },
    countMode() {
      this.loadData()
    },
    userMode() {
      this.loadData()
    },
    year() {
      this.loadData()
    },
    month() {
      this.loadData()
    },
    searchText() {
      this.currentPage = 1
      this.initializeTable()
    },
    filteredData() {
      this.initializeTable()
    }
  }
}
</script>

<style lang="scss" scoped>
.dark {
  .table-controls {
    .combobox,
    .search-field {
      background-color: $dark-grey;
      color: $white;
    }
  }

  .pagination-info {
    color: $white-grey;
  }

  .info {
    color: $white;
  }
}

.data-list {
  margin-top: 0;
}

.table-controls {
  padding: 1rem 0;
  gap: 1rem;
  align-items: flex-end;

  .search-field {
    min-width: 200px;
  }

  .combobox {
    min-width: 150px;
  }
}

.datatable-wrapper {
  overflow: auto;
  margin-bottom: 1rem;
  max-height: 600px;
}

.datatable {
  min-width: 100%;

  th {
    min-width: 120px;
    text-align: left;

    &.sortable {
      cursor: pointer;
      user-select: none;

      &:hover {
        background-color: var(--background-hover);
      }
    }
  }

  td {
    padding: 0.75rem;
    vertical-align: middle;
    border-bottom: 1px solid var(--border);
  }
}

.table-pagination {
  align-items: center;
  padding: 1rem 0;

  .pagination-info {
    font-size: 0.875rem;
    color: var(--text-alt);
  }

  .button-simple {
    margin-left: 0.5rem;
  }
}

.empty-quota {
  padding: 2rem;

  .info {
    font-style: italic;
    color: var(--text-alt);
  }
}

.status-cell {
  display: inline-block;
  padding: 0.25rem 0.5rem;
  border-radius: 0.25rem;
  font-size: 0.75rem;
  font-weight: bold;
  text-align: center;
  min-width: 3rem;
}

// .check-icon {
//   stroke: $dark-grey-lightest;
// }

.close-icon {
  stroke: $dark-grey-lightest;
}
</style>
