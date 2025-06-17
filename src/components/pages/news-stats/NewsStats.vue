<template>
  <div class="data-list">
    <div class="datatable-wrapper" ref="body">
      <table class="datatable">
        <thead class="datatable-head">
          <tr>
            <th
              scope="col"
              class="name datatable-row-header"
              ref="rowHeaderName"
            >
              {{ $t('news-stats.name') }}
            </th>
            <th
              scope="col"
              class="average datatable-row-header"
              :style="{ left: averageColumnX }"
            >
              {{ $t('news-stats.average') }}
            </th>
            <th scope="col" :key="'time-' + time" v-for="time in timeRange">
              {{ timeToString(time) }}
            </th>
          </tr>
        </thead>
        <tbody class="datatable-body" v-if="statsLength > 0 && !isLoading">
          <tr
            :key="'name-' + key"
            class="datatable-row"
            v-for="key in entryIds"
          >
            <th scope="row" class="name datatable-row-header">
              <div class="flexrow" v-if="taskTypeId && key !== 'total'">
                <people-avatar :size="30" :person="personMap.get(key)" />
                {{ personMap.get(key).full_name }}
              </div>
              <div class="flexrow" v-else-if="taskTypeId && key === 'total'">
                {{ $t('main.total') }}
              </div>
              <div class="flexrow" v-else-if="personId && key !== 'total'">
                {{ taskTypeMap.get(key).name }}
              </div>
              <div class="flexrow" v-else-if="personId && key === 'total'">
                {{ $t('main.total') }}
              </div>
            </th>
            <td
              class="average datatable-row-header"
              :style="{ left: averageColumnX }"
              :set="stats = getStats(key, 'average')"
            >
              <span
                v-for="(stat, status_id) in stats"
                :key="key + '-' + status_id"
                class="stat-chip-container"
              >
                <status-chip
                  v-if="stat"
                  :status="taskStatusMap.get(status_id)"
                  :date="stat.date"
                  :initial="stat.initial_status"
                  :repeat="stat.repeat_status"
                  :count-mode="countMode"
                />
              </span>
            </td>
            <td
              :key="'time-' + time"
              v-for="time in timeRange"
              :set="stats = getStats(key, time)"
              :class="{
                weekend: isWeekend(time),
                selected: isSelected(key, time),
                'stat-low': isStatLow(stats)
              }"
            >
              <div
                v-if="stats"
                :class="{
                  'stats-button': key !== 'total'
                }"
                @click="openDetail(key, time, $route.query)"
              >
                <span
                  v-for="(stat, status_id) in stats"
                  :key="status_id"
                  class="stat-chip-container"
                >
                  <status-chip
                    v-if="stat"
                    :status="taskStatusMap.get(status_id)"
                    :date="stat.date"
                    :initial="stat.initial_status"
                    :repeat="stat.repeat_status"
                    :count-mode="countMode"
                  />
                </span>
              </div>
              <span v-else> - </span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
    <div
      class="has-text-centered empty-quota"
      v-if="statsLength === 0 && !isLoading"
    >
      <p class="info">{{ $t('quota.no_quota') }}</p>
    </div>

    <table-info :is-loading="isLoading" :is-error="isError" />
  </div>
</template>

<script>
import moment from 'moment-timezone'
import { mapGetters, mapActions } from 'vuex'

import { buildNameIndex, indexSearch } from '@/lib/indexing'
import { sortTaskTypes } from '@/lib/sorting'

import {
  monthToString,
  getMonthRange,
  getWeekRange,
  getDayRange,
  getDateBoundaries
} from '@/lib/time'
import { timeMixin } from '@/components/mixins/time'

import PeopleAvatar from '@/components/widgets/PeopleAvatar.vue'
import TableInfo from '@/components/widgets/TableInfo.vue'
import StatusChip from '@/components/widgets/StatusChip.vue'

export default {
  name: 'news-stats',

  mixins: [timeMixin],

  components: {
    PeopleAvatar,
    TableInfo,
    StatusChip
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
    },
    before: {
      type: String,
      default: null
    },
    after: {
      type: String,
      default: null
    }
  },

  data() {
    return {
      currentMonth: moment().month() + 1,
      currentYear: moment().year(),
      currentWeek: moment().week(),
      detailsMap: {},
      isLoading: true,
      isLoadingData: false,
      isError: false,
      lastParams: false,
      personIds: [],
      statsData: {},
      totalsMap: {},
      statsLength: 0,
      averageColumnX: '12rem',
      personIndex: {}
    }
  },

  mounted() {
    this.loadData()
    this.setPersonIndex()
  },

  computed: {
    ...mapGetters([
      'currentEpisode',
      'currentProduction',
      'personMap',
      'taskStatusMap',
      'taskTypeMap'
    ]),

    timeRange() {
      if (this.detailLevel === 'day') {
        return getDayRange(
          this.year,
          this.month,
          this.currentYear,
          this.currentMonth
        )
      } else if (this.detailLevel === 'week') {
        return getWeekRange(this.year, this.currentYear, this.currentWeek)
      } else {
        return getMonthRange(this.year, this.currentYear, this.currentMonth)
      }
    },

    entryIds() {
      if (this.personId) return this.personTaskTypeIds
      else return this.filteredPersonIds
    },

    filteredPersonIds() {
      let personIds = this.personIds
      if (this.searchText.length > 0) {
        personIds = indexSearch(
          this.personIndex,
          this.searchText.split(' ')
        ).map(person => person.id)
      }
      return personIds
    },

    personTaskTypeIds() {
      const taskTypeIds = sortTaskTypes(
        Object.keys(this.statsData)
          .filter(key => key !== 'total')
          .map(taskTypeId => this.taskTypeMap.get(taskTypeId)),
        this.currentProduction
      ).map(taskType => taskType.id)

      // we only need a total row if we have more than 1 task type
      return taskTypeIds.length > 1
        ? taskTypeIds.concat(['total'])
        : taskTypeIds
    }
  },

  methods: {
    ...mapActions(['loadNewsStats', 'loadNews']),

    setPersonIndex() {
      this.personIndex = buildNameIndex(Array.from(this.personMap.values()))
    },

    getPersonIds() {
      const personIds = []
      Object.keys(this.statsData).forEach(taskTypeId => {
        Object.keys(this.statsData[taskTypeId]).forEach(personId => {
          if (!personIds.includes(personId)) personIds.push(personId)
        })
      })
      return personIds
    },

    loadData() {
      if (!this.isLoadingData && (this.taskTypeId || this.personId)) {
        const year = this.year
        const month = this.detailLevel === 'day' ? this.month : null
        const { from, to } = getDateBoundaries(year, month)

        const params = {
          productionId: this.currentProduction?.id,
          task_type_id: this.taskTypeId || undefined,
          task_status_id: this.taskStatusIds?.join(',') || undefined,
          person_id: this.personId || undefined,
          detail: this.detailLevel,
          // we want only the changed statuses
          change: 1,
          // timezone for calulating the group by day/week/month correctly
          timezone: this.timezone, // eg. "Europe/London" "UTC"
          after: this.formatDateAsUTC(from),
          before: this.formatDateAsUTC(to)
        }

        // dont reload if the params are the same
        if (JSON.stringify(params) === JSON.stringify(this.lastParams)) return

        this.lastParams = params
        this.isLoading = this.isLoadingData = true
        this.isError = false

        this.loadNewsStats(params)
          .then(data => {
            this.statsData = data
            this.personIds = this.getPersonIds()
            this.statsLength = this.personIds.length
            this.calcAverageColumnX()
            this.calcPersonAverageAndTotals()
            this.calcTotals()

            this.$nextTick(() => {
              this.isLoading = this.isLoadingData = false
              // Wait for data to be rendered and then scroll
              setTimeout(() => this.scrollToSelected(), 500)
            })
          })
          .catch(err => {
            this.statsData = {}
            this.statsLength = 0
            this.calcAverageColumnX()
            this.isError = true
            console.error(err)
          })
          .finally(() => {
            this.isLoading = this.isLoadingData = false
          })
      }
    },

    monthToString,

    dateDigit(date) {
      return date.toString().padStart(2, '0')
    },

    /**
     * Get the stats for a person and time period
     * @param key - The author id or 'total' for the total row
     * @param column - The time period, day number, week number, or month number or 'average' for the average column
     * @returns The stats for the person and time period
     */
    getStats(row, column) {
      // convert 1, 2, 3... to YYYY-MM-DD, YYYY-MM, YYYY-MM-DD
      if (column !== 'average') column = this.getDateKeyFromColumn(column)

      if (row === 'total') {
        return this.totalsMap[column] || false
      }

      // if we are in person mode then the row is the task_type_id
      if (this.personId) {
        return this.statsData?.[row]?.[this.personId]?.[column] || false
      }
      // other wise the row is the author_id
      else if (this.taskTypeId) {
        return this.statsData?.[this.taskTypeId]?.[row]?.[column] || false
      }
      // else we have a problem
      else return false
    },

    getDateKeyFromColumn(column) {
      const year = this.year
      let month = this.month
      let week
      let day

      switch (this.detailLevel) {
        case 'day':
          day = column
          return `${year}-${this.dateDigit(month)}-${this.dateDigit(day)}`
        case 'week':
          week = column
          return `${year}-${week}`
        case 'month':
          month = column
          return `${year}-${this.dateDigit(month)}`
      }
    },

    isSelected(key, time) {
      // if we are in person tab then key is the taskType and vice versa
      const personId = this.taskTypeId ? key : this.personId

      let month, week, day

      switch (this.detailLevel) {
        case 'day':
        default:
          month = this.month
          day = time
          break
        case 'week':
          week = time
          break
        case 'month':
          month = time
          break
      }
      return (
        this.$route.params.person_id &&
        this.$route.params.person_id === personId &&
        '' + this.$route.params.year === '' + this.year &&
        '' + this.$route.params.week === '' + week &&
        '' + this.$route.params.month === '' + month &&
        '' + this.$route.params.day === '' + day
      )
    },

    isWeekend(time) {
      if (this.detailLevel !== 'day') return false

      const day = this.dateDigit(time)
      const date = moment(`${this.year}-${this.month}-${day}`, 'YYYY-MM-DD')
      return [0, 6].includes(date.day())
    },

    /**
     * returns true if the initial status of any status is less than the maxStat
     * @param stats
     */
    isStatLow(stats) {
      if (!this.maxStat || !stats) return false
      for (const statusId in stats) {
        if (stats[statusId].initial_status?.[this.countMode] < this.maxStat)
          return true
      }
      return false
    },

    openDetail(row, column, query) {
      if (row === 'total') return
      if (!column) return

      const person_id = this.personId ? this.personId : row
      const task_type_id = this.taskTypeId ? this.taskTypeId : row

      let route_name, month, week, day
      switch (this.detailLevel) {
        case 'day':
        default:
          route_name = 'news-stats-day-person'
          month = this.month
          day = column
          break
        case 'week':
          route_name = 'news-stats-week-person'
          week = column
          break
        case 'month':
          route_name = 'news-stats-month-person'
          month = column
          break
      }

      const route = {
        name: route_name,
        params: {
          person_id: person_id,
          year: this.year,
          month: month,
          week: week,
          day: day
        },
        query: {
          ...query,
          taskTypeId: task_type_id
        }
      }
      this.$router.push(route)
    },

    timeToString(time) {
      return this.detailLevel === 'month'
        ? monthToString(time)
        : time.toString()
    },

    calcAverageColumnX() {
      if (this.$refs.rowHeaderName) {
        this.averageColumnX = `${this.$refs.rowHeaderName.offsetWidth}px`
      }
    },

    calcPersonAverageAndTotals() {
      // Calculate averages for each person within each task type
      Object.keys(this.statsData).forEach(taskTypeId => {
        const taskTypeStats = this.statsData[taskTypeId]
        Object.keys(taskTypeStats).forEach(personId => {
          const personStats = taskTypeStats[personId]
          const timeKeys = Object.keys(personStats).filter(
            key => key !== 'average'
          )

          if (timeKeys.length > 0) {
            const averageStats = {}

            // Calculate average for each status
            timeKeys.forEach(timeKey => {
              const dayStats = personStats[timeKey]
              Object.keys(dayStats).forEach(statusId => {
                if (!averageStats[statusId]) {
                  averageStats[statusId] = {
                    initial_status: {
                      nb_frames: 0,
                      nb_seconds: 0,
                      nb_drawings: 0,
                      count: 0
                    },
                    repeat_status: {
                      nb_frames: 0,
                      nb_seconds: 0,
                      nb_drawings: 0,
                      count: 0
                    },
                    date: 'average'
                  }
                }
                averageStats[statusId].initial_status.count +=
                  dayStats[statusId].initial_status.count
                averageStats[statusId].initial_status.nb_frames +=
                  dayStats[statusId].initial_status.nb_frames
                averageStats[statusId].initial_status.nb_seconds +=
                  dayStats[statusId].initial_status.nb_seconds
                averageStats[statusId].initial_status.nb_drawings +=
                  dayStats[statusId].initial_status.nb_drawings
                averageStats[statusId].repeat_status.count +=
                  dayStats[statusId].repeat_status.count
                averageStats[statusId].repeat_status.nb_frames +=
                  dayStats[statusId].repeat_status.nb_frames
                averageStats[statusId].repeat_status.nb_seconds +=
                  dayStats[statusId].repeat_status.nb_seconds
                averageStats[statusId].repeat_status.nb_drawings +=
                  dayStats[statusId].repeat_status.nb_drawings
              })
            })

            // Divide by number of days for average
            Object.keys(averageStats).forEach(statusId => {
              averageStats[statusId].initial_status.count = Math.round(
                averageStats[statusId].initial_status.count / timeKeys.length
              )
              averageStats[statusId].initial_status.nb_frames = Math.round(
                averageStats[statusId].initial_status.nb_frames /
                  timeKeys.length
              )
              averageStats[statusId].initial_status.nb_seconds = Math.round(
                averageStats[statusId].initial_status.nb_seconds /
                  timeKeys.length
              )
              averageStats[statusId].initial_status.nb_drawings = Math.round(
                averageStats[statusId].initial_status.nb_drawings /
                  timeKeys.length
              )
              averageStats[statusId].repeat_status.count = Math.round(
                averageStats[statusId].repeat_status.count / timeKeys.length
              )
              averageStats[statusId].repeat_status.nb_frames = Math.round(
                averageStats[statusId].repeat_status.nb_frames / timeKeys.length
              )
              averageStats[statusId].repeat_status.nb_seconds = Math.round(
                averageStats[statusId].repeat_status.nb_seconds /
                  timeKeys.length
              )
              averageStats[statusId].repeat_status.nb_drawings = Math.round(
                averageStats[statusId].repeat_status.nb_drawings /
                  timeKeys.length
              )
            })

            this.statsData[taskTypeId][personId]['average'] = averageStats
          }
        })
      })
    },

    calcTotals() {
      this.totalsMap = {}

      // Collect all time keys across all task types and persons
      const allTimeKeys = []
      Object.values(this.statsData).forEach(taskTypeStats => {
        Object.values(taskTypeStats).forEach(personStats => {
          Object.keys(personStats).forEach(timeKey => {
            if (timeKey !== 'average') allTimeKeys.push(timeKey)
          })
        })
      })

      // Calculate totals for each time period
      allTimeKeys.forEach(timeKey => {
        const totals = {}

        // Sum up stats across all task types and persons
        Object.values(this.statsData).forEach(taskTypeStats => {
          Object.values(taskTypeStats).forEach(personStats => {
            if (personStats[timeKey]) {
              Object.keys(personStats[timeKey]).forEach(statusId => {
                if (!totals[statusId]) {
                  totals[statusId] = {
                    initial_status: {
                      nb_frames: 0,
                      nb_seconds: 0,
                      nb_drawings: 0,
                      count: 0
                    },
                    repeat_status: {
                      nb_frames: 0,
                      nb_seconds: 0,
                      nb_drawings: 0,
                      count: 0
                    },
                    date: timeKey
                  }
                }
                const stat = personStats[timeKey][statusId]
                totals[statusId].initial_status.count +=
                  stat.initial_status.count
                totals[statusId].initial_status.nb_frames +=
                  stat.initial_status.nb_frames
                totals[statusId].initial_status.nb_seconds +=
                  stat.initial_status.nb_seconds
                totals[statusId].initial_status.nb_drawings +=
                  stat.initial_status.nb_drawings
                totals[statusId].repeat_status.count += stat.repeat_status.count
                totals[statusId].repeat_status.nb_frames +=
                  stat.repeat_status.nb_frames
                totals[statusId].repeat_status.nb_seconds +=
                  stat.repeat_status.nb_seconds
                totals[statusId].repeat_status.nb_drawings +=
                  stat.repeat_status.nb_drawings
              })
            }
          })
        })

        if (Object.keys(totals).length > 0) {
          this.totalsMap[timeKey] = totals
        }
        // Calculate average across all time periods for totals
        const averageTotals = {}
        const timeKeyCount = Object.keys(this.totalsMap).length

        Object.values(this.totalsMap).forEach(totals => {
          Object.entries(totals).forEach(([statusId, stat]) => {
            if (!averageTotals[statusId]) {
              averageTotals[statusId] = {
                initial_status: {
                  nb_frames: 0,
                  nb_seconds: 0,
                  nb_drawings: 0,
                  count: 0
                },
                repeat_status: {
                  nb_frames: 0,
                  nb_seconds: 0,
                  nb_drawings: 0,
                  count: 0
                },
                date: 'average'
              }
            }
            averageTotals[statusId].initial_status.count +=
              stat.initial_status.count
            averageTotals[statusId].initial_status.nb_frames +=
              stat.initial_status.nb_frames
            averageTotals[statusId].initial_status.nb_seconds +=
              stat.initial_status.nb_seconds
            averageTotals[statusId].initial_status.nb_drawings +=
              stat.initial_status.nb_drawings
            averageTotals[statusId].repeat_status.count +=
              stat.repeat_status.count
            averageTotals[statusId].repeat_status.nb_frames +=
              stat.repeat_status.nb_frames
            averageTotals[statusId].repeat_status.nb_seconds +=
              stat.repeat_status.nb_seconds
            averageTotals[statusId].repeat_status.nb_drawings +=
              stat.repeat_status.nb_drawings
          })
        })

        // Divide sums by number of time periods to get averages
        Object.values(averageTotals).forEach(stat => {
          stat.initial_status.count /= timeKeyCount
          stat.initial_status.nb_frames /= timeKeyCount
          stat.initial_status.nb_seconds /= timeKeyCount
          stat.initial_status.nb_drawings /= timeKeyCount
          stat.repeat_status.count /= timeKeyCount
          stat.repeat_status.nb_frames /= timeKeyCount
          stat.repeat_status.nb_seconds /= timeKeyCount
          stat.repeat_status.nb_drawings /= timeKeyCount
        })

        this.totalsMap.average = averageTotals
      })
    },

    scrollToSelected() {
      if (!this.$refs.body) {
        return
      }

      // Find the selected cell - try different selectors
      const selectedCell = this.$refs.body.querySelector('td.selected')

      if (!selectedCell) {
        return
      }

      // Get the container's scroll position
      const container = this.$refs.body
      const containerRect = container.getBoundingClientRect()
      const cellRect = selectedCell.getBoundingClientRect()

      // Calculate the scroll position needed to center the cell
      const scrollLeft =
        cellRect.left -
        containerRect.left -
        containerRect.width / 2 +
        cellRect.width / 2
      const scrollTop =
        cellRect.top -
        containerRect.top -
        containerRect.height / 2 +
        cellRect.height / 2

      // Scroll the container
      container.scrollTo({
        left: container.scrollLeft + scrollLeft,
        top: container.scrollTop + scrollTop,
        behavior: 'smooth'
      })
    }
  },

  watch: {
    $route() {
      setTimeout(() => this.scrollToSelected(), 500)
    },
    taskTypeId() {
      this.loadData()
    },
    personId() {
      this.loadData()
    },
    taskStatusIds() {
      this.loadData()
    },
    detailLevel() {
      this.loadData()
    },
    year() {
      this.loadData()
    },
    month() {
      this.loadData()
    },
    week() {
      this.loadData()
    },
    day() {
      this.loadData()
    },
    before() {
      this.loadData()
    },
    after() {
      this.loadData()
    }
  }
}
</script>

<style lang="scss" scoped>
.dark {
  .weekend {
    background-color: $dark-grey;
  }
  .info {
    color: $white;
  }
}

.data-list {
  margin-top: 0;
}

.datatable-wrapper {
  overflow: auto;
  margin-bottom: 1rem;
}

.datatable {
  min-width: auto;
  .name {
    min-width: 12rem;
    text-align: left;
    justify-content: flex-start;
    .avatar {
      margin-right: 0.5rem;
    }
  }
  .average {
    width: 8rem;
  }
  th,
  td {
    text-align: center;
  }
}

.datatable-head th {
  min-width: 4rem;
}

.datatable-body th {
  padding: 1rem;
}

.datatable-body {
  th,
  td {
    border: 0;
  }
}

.stats-button {
  border-radius: 0.5rem;
  padding: 0.5rem;
  background: transparent;
  border: 0;
  cursor: pointer;
  color: inherit;
  font-size: inherit;
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 100%;
  &:hover,
  &:focus,
  &.selected {
    background-color: $dark-grey-lightest;
  }
}

.empty-stats {
  width: 100%;
}

.selected .stats-button {
  background: $purple;
  color: #333;
}
td.stat-low {
  background-color: rgba(255, 242, 65, 0.2);
}

.stats-button:hover {
  background: #bbeebb;
}
.stat-chip-container {
  .stat-chip {
    margin-bottom: 0.3rem;
  }
  &:last-child {
    .stat-chip {
      margin-bottom: 0;
    }
  }
}

.weekend {
  background-color: $white-grey;
}
</style>
