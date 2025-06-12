<template>
  <div class="data-list">
    <!-- Search and Filter Controls -->
    <div class="table-controls flexrow mb1">
      <span class="filler"></span>
      <button-simple
        class="flexrow-item"
        icon="export"
        :title="$t('datatable.export_csv')"
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
                <span class="flexrow-item">{{ $t('main.date') }}</span>
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
            <th class="sortable" @click="toggleSort('author_id')">
              <div class="flexrow">
                <span class="flexrow-item">{{ $t('news.author') }}</span>
                <span class="flexrow-item ml05">
                  <span
                    v-if="sortColumn === 'author_id' && sortDirection === 'asc'"
                    >↑</span
                  >
                  <span
                    v-else-if="
                      sortColumn === 'author_id' && sortDirection === 'desc'
                    "
                    >↓</span
                  >
                  <span v-else>↕</span>
                </span>
              </div>
            </th>
            <th class="sortable" @click="toggleSort('task_entity_id')">
              <div class="flexrow">
                <span class="flexrow-item">{{ $t('news.entity') }}</span>
                <span class="flexrow-item ml05">
                  <span
                    v-if="
                      sortColumn === 'task_entity_id' && sortDirection === 'asc'
                    "
                    >↑</span
                  >
                  <span
                    v-else-if="
                      sortColumn === 'task_entity_id' &&
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
                <span class="flexrow-item">{{ $t('news.task_type') }}</span>
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
            <th class="sortable" @click="toggleSort('task_status_id')">
              <div class="flexrow">
                <span class="flexrow-item">{{ $t('news.task_status') }}</span>
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
            <th class="sortable" @click="toggleSort('initial_status')">
              <div class="flexrow">
                <span class="flexrow-item">{{ $t('news.is_initial') }}</span>
                <span class="flexrow-item ml05">
                  <span
                    v-if="
                      sortColumn === 'initial_status' && sortDirection === 'asc'
                    "
                    >↑</span
                  >
                  <span
                    v-else-if="
                      sortColumn === 'initial_status' &&
                      sortDirection === 'desc'
                    "
                    >↓</span
                  >
                  <span v-else>↕</span>
                </span>
              </div>
            </th>
            <th
              v-if="countMode !== 'count'"
              class="sortable"
              @click="toggleSort('count')"
            >
              <div class="flexrow">
                <span class="flexrow-item">{{ getCountModeLabel() }}</span>
                <span class="flexrow-item ml05">
                  <span v-if="sortColumn === 'count' && sortDirection === 'asc'"
                    >↑</span
                  >
                  <span
                    v-else-if="
                      sortColumn === 'count' && sortDirection === 'desc'
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
          <tr
            v-for="news in paginatedData"
            :key="'news-' + news.id"
            class="datatable-row"
            @click="openNewsDetail(news)"
          >
            <td>{{ formatFullDate(news.created_at) }}</td>
            <td>
              <div class="flexrow">
                <people-avatar
                  class="flexrow-item mr1"
                  :person="personMap.get(news.author_id)"
                  :size="25"
                />
                <span class="flexrow-item">{{
                  personMap.get(news.author_id)?.full_name
                }}</span>
              </div>
            </td>
            <td>
              <div class="flexrow">
                <entity-thumbnail
                  class="entity-thumbnail flexrow-item mr1"
                  :entity="{
                    id: news.task_entity_id,
                    preview_file_id: news.entity_preview_file_id
                  }"
                  :with-link="false"
                />
                <span class="flexrow-item">{{ news.full_entity_name }}</span>
              </div>
            </td>
            <td>
              <task-type-name
                :task-type="buildTaskTypeFromNews(news)"
                :production-id="news.project_id"
                :is-static="true"
              />
            </td>
            <td>
              <validation-tag
                :task="buildTaskFromNews(news)"
                :is-static="true"
                :thin="!news.change"
              />
            </td>
            <td>
              <div
                class="flexrow"
                :style="{ stroke: news.initial_status ? 'green' : 'red' }"
              >
                <check-icon
                  v-if="news.initial_status"
                  class="check-icon"
                  :size="18"
                />
                <x-icon v-else class="close-icon" :size="18" />
              </div>
            </td>
            <td v-if="countMode !== 'count'">{{ getNewsValue(news) }}</td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Pagination -->
    <div
      class="table-pagination flexrow mt1"
      v-if="!isLoading && filteredNewsList.length > 0"
    >
      <div class="flexrow-item">
        <span class="pagination-info">
          {{ $t('datatable.showing') }} {{ (currentPage - 1) * pageSize + 1 }}
          {{ $t('datatable.to') }}
          {{
            Math.min(
              currentPage * pageSize,
              filteredNewsList.length
            ).toLocaleString()
          }}
          {{ $t('datatable.of') }}
          {{ filteredNewsList.length.toLocaleString() }}
          {{ $t('datatable.entries') }}
        </span>
      </div>
      <span class="filler"></span>
      <div class="flexrow-item">
        <button-simple
          :text="$t('datatable.previous')"
          :disabled="currentPage <= 1"
          @click="currentPage--"
        />
        <button-simple
          :text="$t('datatable.next')"
          :disabled="currentPage >= totalPages"
          @click="currentPage++"
        />
      </div>
    </div>

    <table-info :is-loading="isLoading" :is-error="isError" />

    <div
      class="has-text-centered empty-list"
      v-if="filteredNewsList.length === 0 && !isLoading"
    >
      <p class="info">{{ $t('news.no_news') }}</p>
    </div>
  </div>
</template>

<script>
import moment from 'moment-timezone'
import { mapGetters, mapActions } from 'vuex'
import { XIcon, CheckIcon } from 'lucide-vue-next'

import csv from '@/lib/csv'
import { formatDate, formatFullDate, getDateBoundaries } from '@/lib/time'
import { timeMixin } from '@/components/mixins/time'

import { indexSearch, buildNameIndex } from '@/lib/indexing'

import ButtonSimple from '@/components/widgets/ButtonSimple.vue'
import PeopleAvatar from '@/components/widgets/PeopleAvatar.vue'
import EntityThumbnail from '@/components/widgets/EntityThumbnail.vue'
import TaskTypeName from '@/components/widgets/TaskTypeName.vue'
import ValidationTag from '@/components/widgets/ValidationTag.vue'
import TableInfo from '@/components/widgets/TableInfo.vue'

export default {
  name: 'news-data-table',

  mixins: [timeMixin],

  components: {
    ButtonSimple,
    PeopleAvatar,
    EntityThumbnail,
    TaskTypeName,
    ValidationTag,
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
      default: 0
    }
  },

  data() {
    return {
      isLoading: true,
      isError: false,
      newsIndex: {},
      sortColumn: 'created_at',
      sortDirection: 'desc',
      currentPage: 1,
      pageSize: 50,
      totalPages: 1
    }
  },

  computed: {
    ...mapGetters([
      'currentProduction',
      'newsList',
      'personMap',
      'taskStatusMap',
      'taskTypeMap'
    ]),

    fps() {
      return this.currentProduction.fps
    },

    filteredNewsList() {
      let filtered = this.newsList

      if (this.searchText.length > 0) {
        const searchResults = indexSearch(
          this.newsIndex,
          this.searchText.split(' ')
        )
        const searchIds = new Set(searchResults.map(news => news.id))
        filtered = filtered.filter(news => searchIds.has(news.id))
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
            case 'author_id':
              aValue =
                this.personMap.get(a.author_id)?.full_name.toLowerCase() || ''
              bValue =
                this.personMap.get(b.author_id)?.full_name.toLowerCase() || ''
              break
            case 'task_entity_id':
              aValue = a.full_entity_name.toLowerCase()
              bValue = b.full_entity_name.toLowerCase()
              break
            case 'task_type_id':
              aValue =
                this.taskTypeMap.get(a.task_type_id)?.name.toLowerCase() || ''
              bValue =
                this.taskTypeMap.get(b.task_type_id)?.name.toLowerCase() || ''
              break
            case 'task_status_id':
              aValue =
                this.taskStatusMap
                  .get(a.task_status_id)
                  ?.short_name.toLowerCase() || ''
              bValue =
                this.taskStatusMap
                  .get(b.task_status_id)
                  ?.short_name.toLowerCase() || ''
              break
            case 'initial_status':
              aValue = a.initial_status ? 1 : 0
              bValue = b.initial_status ? 1 : 0
              break
            case 'count':
              aValue = this.getNewsValue(a)
              bValue = this.getNewsValue(b)
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
      return this.filteredNewsList.slice(start, end)
    }
  },

  mounted() {
    this.loadData()
  },

  methods: {
    ...mapActions(['loadNews']),

    formatFullDate,
    formatDate,

    initializeTable() {
      this.totalPages = Math.ceil(this.filteredNewsList.length / this.pageSize)
    },

    buildTaskFromNews(news) {
      return {
        id: news.task_id,
        task_status_id: news.task_status_id,
        task_type_id: news.task_type_id,
        episode_id: news.episode_id
      }
    },

    buildTaskTypeFromNews(news) {
      return {
        ...this.taskTypeMap.get(news.task_type_id),
        episode_id: news.episode_id
      }
    },

    getNewsValue(news) {
      switch (this.countMode) {
        case 'nb_frames':
        default:
          return news.nb_frames || 0
        case 'nb_seconds':
          return (news.nb_frames / this.fps).toFixed(2) || '-'
        case 'nb_drawings':
          return news.nb_drawings || 0
      }
    },

    getCountModeLabel() {
      switch (this.countMode) {
        case 'nb_frames':
        default:
          return this.$t('status-stats.frames')
        case 'nb_seconds':
          return this.$t('status-stats.seconds')
        case 'nb_drawings':
          return this.$t('status-stats.drawings')
      }
    },

    openNewsDetail(news) {
      const after = moment.tz(news.created_at, 'UTC').tz(this.timezone)
      const before = moment(after).subtract(1, 'day')

      const route = {
        name: 'news-feed',
        query: {
          task_type_id: this.taskTypeId,
          task_status_id: this.taskStatusIds.join(','),
          person_id: this.personId,
          news_id: news.id,
          after: after.format('YYYY-MM-DD'),
          before: before.format('YYYY-MM-DD')
        }
      }
      this.$router.push(route)
    },

    async loadData() {
      this.isLoading = true
      this.isError = false

      const { from, to } = getDateBoundaries(
        this.year,
        this.detailLevel === 'day' ? this.month : null
      )

      const params = {
        productionId: this.currentProduction?.id,
        only_preview: false,
        limit: 1000000000000,
        task_type_id: this.taskTypeId || undefined,
        task_status_id: this.taskStatusIds?.join(',') || undefined,
        person_id: this.personId || undefined,
        before: this.formatDateAsUTC(to),
        after: this.formatDateAsUTC(from)
      }

      this.loadNews(params)
        .then(() => {
          this.setNewsIndex()
          this.initializeTable()
          this.isLoading = false
        })
        .catch(err => {
          console.error(err)
          this.isError = true
          this.isLoading = false
        })
    },

    setNewsIndex() {
      this.newsIndex = buildNameIndex(
        this.newsList.map(news => ({
          id: news.id,
          name: `${news.full_entity_name} ${this.personMap.get(news.author_id)?.full_name || ''} ${news.comment_text || ''}`,
          full_entity_name: news.full_entity_name,
          author_name: this.personMap.get(news.author_id)?.full_name || '',
          comment_text: news.comment_text || ''
        }))
      )
    },

    exportToCsv() {
      const headers = [
        this.$t('main.date'),
        this.$t('main.person'),
        this.$t('shots.fields.entity'),
        this.$t('news.task_type'),
        this.$t('news.task_status'),
        this.$t('news.initial_status')
      ]

      if (this.countMode !== 'count') {
        headers.push(this.getCountModeLabel())
      }

      const csvData = [headers]

      this.filteredNewsList.forEach(news => {
        const row = [
          formatFullDate(news.created_at),
          this.personMap.get(news.author_id)?.full_name || '',
          news.full_entity_name,
          this.taskTypeMap.get(news.task_type_id)?.name || '',
          this.taskStatusMap.get(news.task_status_id)?.name || '',
          news.initial_status ? 'Yes' : 'No'
        ]

        if (this.countMode !== 'count') {
          row.push(this.getNewsValue(news).toString())
        }

        csvData.push(row)
      })

      const nameData = [
        formatDate(new Date()),
        this.currentProduction.name,
        'news-data'
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
    filteredNewsList() {
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
    padding: 0.75rem;

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

.empty-list {
  padding: 2rem;

  .info {
    font-style: italic;
    color: var(--text-alt);
  }
}

.check-icon {
  color: var(--green);
  stroke: var(--green);
}

.close-icon {
  color: var(--red);
  stroke: var(--red);
}

.entity-thumbnail {
  max-width: 40px;
  max-height: 40px;
}
</style>
