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
              {{ $t('status-stats.name') }}
            </th>
            <th
              scope="col"
              class="average datatable-row-header"
              :style="{ left: averageColumnX }"
            >
              {{ $t('status-stats.average') }}
            </th>
            <template v-if="detailLevel === 'month'">
              <th
                scope="col"
                :key="'month-' + month"
                v-for="month in monthRange"
              >
                {{ monthToString(month) }}
              </th>
            </template>
            <template v-else-if="detailLevel === 'week'">
              <th scope="col" :key="'week-' + week" v-for="week in weekRange">
                {{ week }}
              </th>
            </template>
            <template v-else-if="detailLevel === 'day'">
              <th scope="col" :key="'day-' + day" v-for="day in dayRange">
                {{ day }}
              </th>
            </template>
          </tr>
        </thead>
        <tbody class="datatable-body" v-if="statsLength > 0 && !isLoading">
          <tr
            class="datatable-row"
            v-for="key in filteredPersonIds"
            :key="'name-' + key"
          >
            <th scope="row" class="name datatable-row-header">
              <div class="flexrow">
                <people-avatar :size="30" :person="personMap.get(key)" />
                {{ personMap.get(key).full_name }}
              </div>
            </th>
            <td
              class="average datatable-row-header"
              :style="{ left: averageColumnX }"
            >
              <template
                v-if="detailLevel === 'month' || detailLevel === 'week'"
              >
                {{ getStatsAverage(key, { year }) }}
              </template>
              <template v-else-if="detailLevel === 'day'">
                <span
                  v-for="(stat, status_id) in getStatsAverage(key, {
                    year,
                    month
                  })"
                  :key="status_id"
                >
                  <status-chip
                    v-if="stat"
                    :status="taskStatusMap.get(status_id)"
                    :date="`${year}-${month}-${day}`"
                    :first-take="stat.first_take"
                    :retake="stat.retake"
                    :unit="countMode"
                  />
                </span>
              </template>
            </td>
            <template v-if="detailLevel === 'month'">
              <td
                :class="{
                  selected: isMonthSelected(key, year, month),
                  'quota-low': isMonthQuotaLow(key, year, month)
                }"
                :key="'month-' + month"
                v-for="month in monthRange"
              >
                <router-link
                  class="quota-button"
                  :to="
                    episodifyRoute({
                      name: 'quota-month-person',
                      params: {
                        person_id: key,
                        year: year,
                        month: month
                      },
                      query: {
                        countMode: countMode,
                        userMode: userMode,
                        taskTypeId: taskTypeId
                      }
                    })
                  "
                  v-if="getQuota(key, { year, month })"
                >
                  {{
                    countMode === 'seconds'
                      ? getQuota(key, { year, month }).toFixed(2)
                      : getQuota(key, { year, month })
                  }}
                </router-link>
                <span v-else>-</span>
              </td>
            </template>
            <template v-else-if="detailLevel === 'week'">
              <td
                :class="{
                  selected: isWeekSelected(key, year, week),
                  'quota-low': isWeekQuotaLow(key, year, month)
                }"
                :key="'week-' + week"
                v-for="week in weekRange"
              >
                <router-link
                  class="quota-button"
                  :to="
                    episodifyRoute({
                      name: 'quota-week-person',
                      params: {
                        person_id: key,
                        year: year,
                        week: week
                      },
                      query: {
                        countMode: countMode,
                        userMode: userMode,
                        taskTypeId: taskTypeId
                      }
                    })
                  "
                  v-if="getStats(key, { year, week })"
                >
                  {{
                    countMode === 'seconds'
                      ? getStats(key, { year, week }).toFixed(2)
                      : getStats(key, { year, week })
                  }}
                </router-link>
                <span v-else> - </span>
              </td>
            </template>
            <template v-else-if="detailLevel === 'day'">
              <td
                :class="{
                  weekend: isWeekend(year, month, day),
                  selected: isDaySelected(key, year, month, day),
                  'quota-low': isDayStatLow(key, year, month, day)
                }"
                :key="'day-' + day"
                v-for="day in dayRange"
              >
                <span
                  v-for="(stat, status_id) in getStats(key, {
                    year,
                    month,
                    day
                  })"
                  :key="status_id"
                >
                  <status-chip
                    v-if="stat"
                    :status="taskStatusMap.get(status_id)"
                    :date="`${year}-${month}-${day}`"
                    :first-take="stat.first_take"
                    :retake="stat.retake"
                    :unit="countMode"
                  />
                  <span v-else> - </span>
                </span>
              </td>
            </template>
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
import { episodifyRoute } from '@/lib/path'
import {
  monthToString,
  getMonthRange,
  getWeekRange,
  getDayRange
} from '@/lib/time'

import PeopleAvatar from '@/components/widgets/PeopleAvatar.vue'
import TableInfo from '@/components/widgets/TableInfo.vue'
import StatusChip from '@/components/widgets/StatusChip.vue'

export default {
  name: 'status-stats',

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
      required: true
    },
    detailLevel: {
      type: String,
      default: 'day',
      required: true
    },
    countMode: {
      type: String,
      default: 'frames',
      required: true
    },
    userMode: {
      type: String,
      default: 'person',
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
      currentMonth: moment().month() + 1,
      currentYear: moment().year(),
      currentWeek: moment().week(),
      detailsTitle: '',
      detailsMap: {},
      isPanelShown: false,
      isLoading: true,
      isError: false,
      personIds: [],
      quotaMap: {},
      statsMap: {},
      statsLength: 0,
      selected: undefined,
      averageColumnX: '12rem'
    }
  },

  mounted() {
    if (this.shotMap.size < 2) {
      this.isLoading = true
      setTimeout(() => {
        this.loadShots(err => {
          if (!err) {
            this.loadData()
          }
        })
      }, 100)
    } else {
      if (!this.isShotsLoading) this.isLoading = false
      this.loadData()
    }
  },

  computed: {
    ...mapGetters([
      'currentEpisode',
      'isShotsLoading',
      'shotMap',
      'personMap',
      'taskStatusMap',
      'taskTypeMap'
    ]),

    monthRange() {
      return getMonthRange(this.year, this.currentYear, this.currentMonth)
    },

    dayRange() {
      return getDayRange(
        this.year,
        this.month,
        this.currentYear,
        this.currentMonth
      )
    },

    weekRange() {
      return getWeekRange(this.year, this.currentYear, this.currentWeek)
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

    dayStats() {
      return this.getStats(this.key, {
        year: this.year,
        month: this.month,
        day: this.day
      })
    },

    routeParams() {
      return this.episodifyRoute({
        name: 'quota-day-person',
        params: {
          person_id: this.key,
          year: this.year,
          month: this.month,
          day: this.day
        },
        query: {
          countMode: this.countMode,
          userMode: this.userMode,
          taskTypeId: this.taskTypeId
        }
      })
    }
  },

  methods: {
    ...mapActions(['loadShots', 'getStatusStats', 'getPeriodDetails']),

    /**
     * Parse the date and return the appropriate key for the detail level
     * @param datetime - The date to parse
     * @param detailLevel - The detail level day/week/month
     * @returns day: YYYY-MM-DD, week: YYYY-week, month: YYYY-MM
     * examples: day: 2025-04-14, week: 2025-15, month: 2025-04
     */
    parseDateTime(datetime, detailLevel) {
      const momentDate = moment(datetime)
      switch (detailLevel) {
        case 'day':
          return momentDate.format('YYYY-MM-DD')
        case 'week': {
          const weekNum = momentDate.isoWeek().toString().padStart(2, '0')
          return `${momentDate.year()}-${weekNum}`
        }
        case 'month':
          return momentDate.format('YYYY-MM')
        default:
          throw new Error(`Invalid detail level: ${detailLevel}`)
      }
    },

    getDateKey(opt) {
      let key = false
      if (opt.day) {
        key = `${opt.year}-${this.dateDigit(opt.month)}-${this.dateDigit(opt.day)}`
      } else if (opt.week) {
        key = `${opt.year}-${opt.week}`
      } else {
        key = `${opt.year}-${this.dateDigit(opt.month)}`
      }
      return key
    },

    /**
     * Restructure the api response to be grouped by person and detail level
     * @param stats - The stats to group
     * @param detailLevel - The detail level day/week/month
     * @returns The grouped stats
     * example day format:
     * {
     *   'person_id': {
     *     'YYYY-MM-DD': {
     *       'status_id': {
     *         first_take: 40,
     *         retake: 31
     *       }
     *     }
     *   }
     * }
     */
    groupStatsByPerson(stats, detailLevel = 'day') {
      return stats.reduce((groupedStats, stat) => {
        const personId = stat.person_id
        const timeKey = this.parseDateTime(stat.date, detailLevel)

        if (!groupedStats[personId]) groupedStats[personId] = {}
        if (!groupedStats[personId][timeKey])
          groupedStats[personId][timeKey] = {}

        if (!groupedStats[personId][timeKey][stat.task_status_id])
          groupedStats[personId][timeKey][stat.task_status_id] = {
            first_take: 0,
            retake: 0
          }

        // Increment the appropriate counter
        if (stat.is_first) {
          groupedStats[personId][timeKey][stat.task_status_id].first_take +=
            stat.value
        } else {
          groupedStats[personId][timeKey][stat.task_status_id].retake +=
            stat.value
        }
        return groupedStats
      }, {})
    },

    episodifyRoute(route) {
      if (this.currentEpisode) {
        episodifyRoute(route, this.currentEpisode.id)
      }
      return route
    },

    isWeekend(year, month, day) {
      let momentDate = moment(`${year}-${month}-${day}`, 'YYYY-MM-DD')
      if (day < 10)
        momentDate = moment(`${year}-${month}-0${day}`, 'YYYY-MM-DD')
      return [0, 6].includes(momentDate.day())
    },

    loadData() {
      if (this.taskTypeId) {
        this.isLoading = true

        const sample_data = [
          {
            date: '2025-05-08T10:47:38',
            person_id: '22839c45-05eb-4a29-9d85-ca11d5cc2707',
            is_first: true,
            task_status_id: '8a2741ba-6282-4d06-ad10-74b635afed16',
            value: 40
          },
          {
            date: '2025-05-15T10:47:38',
            person_id: '22839c45-05eb-4a29-9d85-ca11d5cc2707',
            is_first: false,
            task_status_id: '8a2741ba-6282-4d06-ad10-74b635afed16',
            value: 10
          },
          {
            date: '2025-05-16T10:47:38',
            person_id: '22839c45-05eb-4a29-9d85-ca11d5cc2707',
            is_first: false,
            task_status_id: '8a2741ba-6282-4d06-ad10-74b635afed16',
            value: 10
          }
        ]
        this.statsList = sample_data

        // Group stats by person and detail level
        this.statsMap = this.groupStatsByPerson(sample_data, this.detailLevel)
        this.personIds = Object.keys(this.statsMap)

        this.statsLength = Object.keys(this.statsMap).length
        this.isLoading = false
      }
    },

    loadDetails(personId, dateString) {
      this.loadShots(err => {
        this.isLoading = true
        if (err) {
          console.error(err)
        } else {
          if (this.taskTypeId) {
            this.getPeriodDetails({
              taskTypeId: this.taskTypeId,
              detailLevel: this.detailLevel,
              personId,
              dateString
            }).then(shots => {
              this.detailsMap = shots
            })
          }
        }
      })
    },
    monthToString,

    dateDigit(date) {
      return date.toString().padStart(2, '0')
    },

    getQuota(personId, opt = {}) {
      if (opt.day) {
        const dayKey = `${opt.year}-${this.dateDigit(
          opt.month
        )}-${this.dateDigit(opt.day)}`
        return this.quotaMap[personId].day[this.countMode][dayKey]
      } else if (opt.week) {
        const weekKey = `${opt.year}-${opt.week}`
        return this.quotaMap[personId].week[this.countMode][weekKey]
      } else {
        const monthKey = `${opt.year}-${this.dateDigit(opt.month)}`
        return this.quotaMap[personId].month[this.countMode][monthKey]
      }
    },

    getStats(personId, opt = {}) {
      const key = this.getDateKey(opt)
      if (!this.statsMap[personId] || !this.statsMap[personId][key])
        return false

      return this.statsMap[personId][key]
    },
    getStatsAverage(personId, opt = {}) {
      const totals = {}
      const personStats = this.statsMap[personId] || {}

      // Initialize totals first
      for (const timeStats of Object.values(personStats)) {
        for (const [status_id, stat] of Object.entries(timeStats)) {
          if (!totals[status_id]) {
            totals[status_id] = {
              take_value: 0,
              take_count: 0,
              retake_value: 0,
              retake_count: 0
            }
          }
          totals[status_id].take_value += stat.first_take || 0
          totals[status_id].take_count += 1
          totals[status_id].retake_value += stat.retake || 0
          totals[status_id].retake_count += 1
        }
      }

      // Calculate averages
      const averages = {}
      for (const [status_id, total] of Object.entries(totals)) {
        averages[status_id] = {
          first_take: total.take_count
            ? total.take_value / total.take_count
            : 0,
          retake: total.retake_count
            ? total.retake_value / total.retake_count
            : 0
        }
      }
      return averages
    },

    getQuotaAverage(personId, opt = {}) {
      let average = 0
      let total = 0
      let nbEntries
      if (this.detailLevel === 'day') {
        const monthKey = `${opt.year}-${this.dateDigit(opt.month)}`
        total = this.quotaMap[personId].month[this.countMode][monthKey]
        nbEntries = this.quotaMap[personId].day.entries[monthKey]
      } else if (this.detailLevel === 'week') {
        const yearKey = opt.year
        total = this.quotaMap[personId].year[this.countMode][yearKey]
        nbEntries = this.quotaMap[personId].week.entries[yearKey]
      } else if (this.detailLevel === 'month') {
        const yearKey = opt.year
        total = this.quotaMap[personId].year[this.countMode][yearKey]
        nbEntries = this.quotaMap[personId].month.entries[yearKey]
      }
      average = total / nbEntries
      return average ? average.toFixed(2) : '-'
    },

    isDaySelected(personId, year, month, day) {
      return (
        this.$route.params.person_id &&
        this.$route.params.person_id === personId &&
        '' + this.$route.params.year === '' + year &&
        '' + this.$route.params.month === '' + month &&
        '' + this.$route.params.day === '' + day
      )
    },

    isWeekSelected(personId, year, week) {
      return (
        this.$route.params.person_id &&
        this.$route.params.person_id === personId &&
        '' + this.$route.params.year === '' + year &&
        '' + this.$route.params.week === '' + week
      )
    },

    isMonthSelected(personId, year, month) {
      return (
        this.$route.params.person_id &&
        this.$route.params.person_id === personId &&
        '' + this.$route.params.year === '' + year &&
        '' + this.$route.params.month === '' + month
      )
    },

    isDayStatLow(personId, year, month, day) {
      const stat = this.getStats(personId, { year, month, day })
      return stat !== null && this.maxStat > stat
    },

    isWeekStatLow(personId, year, week) {
      return this.maxStat > this.getStats(personId, { year, week })
    },

    isMonthStatLow(personId, year, month) {
      return this.maxStat > this.getStats(personId, { year, month })
    },

    calcAverageColumnX() {
      if (this.statsLength > 0) {
        this.averageColumnX = `${this.$refs.rowHeaderName.offsetWidth}px`
      }
    },

    resetPersonIds() {
      const personIds = Object.keys(this.statsMap)
      const persons = personIds.map(pId => this.personMap.get(pId))
      this.personIndex = buildNameIndex(persons)
      this.personIds = personIds.sort((a, b) => {
        const personAName = this.personMap.get(a).full_name
        const personBName = this.personMap.get(b).full_name
        return personAName.localeCompare(personBName)
      })
    }
  },

  watch: {
    $route() {
      const els = document.getElementsByClassName('selected')
      if (els.length === 0) {
        // selected element is not visible
        setTimeout(() => {
          this.$refs.body.scrollLeft += 380
        }, 100)
      }
    },

    computeMode() {
      if (this.taskTypeId && this.taskStatusIds.length > 0) {
        this.loadData()
      }
    },

    quotaMap() {
      this.resetPersonIds()
    },

    statsMap() {
      this.resetPersonIds()
    },

    taskTypeId() {
      if (this.taskTypeId) {
        this.loadData()
      }
    },

    taskStatusIds() {
      if (this.taskStatusIds.length > 0) {
        this.loadData()
      }
    }
  }
}
</script>

<style lang="scss" scoped>
.dark {
  .weekend {
    background-color: $dark-grey;
  }
  .quota-button:hover {
    color: #333;
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

.quota-low {
  color: red;
}

.quota-button {
  border-radius: 0.5rem;
  padding: 0.5rem;
  background: transparent;
  border: 0;
  cursor: pointer;
  color: inherit;
  font-size: inherit;
  &:hover,
  &:focus,
  &.is-selected {
    background-color: $dark-grey-lightest;
  }
}

.empty-quota {
  width: 100%;
}

.selected .quota-button {
  background: $purple;
  color: #333;
}

.quota-button:hover {
  background: #bbeebb;
}

.weekend {
  background-color: $white-grey;
}
</style>
