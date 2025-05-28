<template>
  <div class="columns fixed-page">
    <div class="column main-column">
      <div class="flexrow filters">
        <div class="flexrow-item">
          <combobox-task-type
            class="flexrow-item"
            :label="$t('status-stats.type_label')"
            :task-type-list="productionShotTaskTypes"
            v-model="taskTypeId"
          />
        </div>
        <div class="flexrow-item">
          <combobox-statuses
            :production-id="currentProduction.id"
            :label="$t('status-stats.status_label')"
            :statuses="taskStatuses"
            :multiple="true"
            v-model="taskStatusIds"
          />
        </div>
        <div class="flexrow-item">
          <combobox
            class="flexrow-item"
            :label="$t('status-stats.detail_label')"
            :options="detailLevelOptions"
            v-model="detailLevelString"
          />
        </div>

        <combobox
          class="flexrow-item"
          :label="$t('status-stats.month_label')"
          :options="monthOptions"
          v-model="monthString"
          v-if="detailLevelString === 'day'"
        />

        <combobox
          class="flexrow-item"
          :label="$t('status-stats.year_label')"
          :options="yearOptions"
          v-model="yearString"
        />

        <div class="flexrow-item">
          <combobox
            class="flexrow-item"
            :label="$t('status-stats.count_label')"
            :options="countModeOptions"
            v-model="countMode"
          />
        </div>
        <combobox
          class="flexrow-item"
          :label="$t('status-stats.user_mode')"
          :options="userModeOptions"
          v-model="userMode"
        />
        <div class="flexrow-item">
          <info-question-mark
            class="mt2"
            :text="$t('status-stats.explanation_' + userMode)"
          />
        </div>
        <div class="filler"></div>
        <button-simple
          class="flexrow-item"
          :title="$t('status-stats.export_stats')"
          icon="download"
          @click="exportQuotas"
        />
      </div>

      <div class="flexrow mb2 mt0">
        <search-field
          ref="search-field"
          class="search-field flexrow-item"
          @change="onSearchChange"
        />

        <span class="label flexrow-item">
          {{ $t('status-stats.highlight_stats') }}
        </span>

        <text-field
          class="flexrow-item max-quota-input"
          type="number"
          v-model="maxQuota"
        />
      </div>

      <status-stats
        ref="status-stat-list"
        :task-type-id="taskTypeId"
        :task-status-ids="taskStatusIds"
        :detail-level="detailLevelString"
        :year="currentYear"
        :month="currentMonth"
        :week="currentWeek"
        :day="currentDay"
        :current-person="currentPerson"
        :count-mode="currentMode"
        :user-mode="userMode"
        :search-text="searchText"
        :max-quota="maxQuota"
      />
    </div>
    <div class="column side-column" v-if="showInfo && currentPerson">
      <people-quota-info
        :person="currentPerson"
        :year="currentYear"
        :month="currentMonth"
        :week="currentWeek"
        :day="currentDay"
        :is-loading="isPersonShotsLoading"
        :is-loading-error="false"
        :shots="personShots"
        :count-mode="countMode"
        @close="hideSideInfo"
      />
    </div>
  </div>
</template>

<script>
import moment from 'moment-timezone'
import { mapGetters, mapActions } from 'vuex'

import csv from '@/lib/csv'
import stringHelpers from '@/lib/string'

import { monthToString, range } from '@/lib/time'
import { episodifyRoute } from '@/lib/path'

import ButtonSimple from '@/components/widgets/ButtonSimple.vue'
import Combobox from '@/components/widgets/Combobox.vue'
import ComboboxStatuses from '@/components/widgets/ComboboxStatuses.vue'
import ComboboxTaskType from '@/components/widgets/ComboboxTaskType.vue'
import InfoQuestionMark from '@/components/widgets/InfoQuestionMark.vue'
import PeopleQuotaInfo from '@/components/sides/PeopleQuotaInfo.vue'
import StatusStats from '@/components/pages/status-stats/StatusStats.vue'
import SearchField from '@/components/widgets/SearchField.vue'
import TextField from '@/components/widgets/TextField.vue'

export default {
  name: 'production-status-stats',

  components: {
    ButtonSimple,
    Combobox,
    ComboboxStatuses,
    ComboboxTaskType,
    InfoQuestionMark,
    PeopleQuotaInfo,
    StatusStats,
    SearchField,
    TextField
  },

  data() {
    return {
      taskTypeId: '',
      taskStatusIds: [],
      countMode: 'frames',
      countModeOptions: [
        { label: this.$t('status-stats.frames'), value: 'frames' },
        { label: this.$t('status-stats.seconds'), value: 'seconds' },
        { label: this.$t('status-stats.count'), value: 'count' }
      ],
      detailLevelOptions: [
        { label: this.$t('status-stats.day'), value: 'day' },
        { label: this.$t('status-stats.week'), value: 'week' },
        { label: this.$t('status-stats.month'), value: 'month' }
      ],
      userModeOptions: [
        { label: this.$t('status-stats.person'), value: 'person' },
        {
          label: this.$t('status-stats.assignee_shared'),
          value: 'assignee_shared'
        },
        {
          label: this.$t('status-stats.assignee_split'),
          value: 'assignee_split'
        }
      ],
      userMode: 'person',
      currentYear: moment().year(),
      currentMonth: moment().month() + 1,
      currentWeek: moment().week(),
      currentDay: moment().date(),
      currentPerson: this.getCurrentPerson(),
      currentMode: 'frames',

      detailLevelString: 'day',
      detailLevel: 'day',

      isLoading: false,
      isLoadingError: false,
      isPersonShotsLoading: false,
      maxQuota: 0,
      monthString: `${moment().month() + 1}`,

      personShots: [],
      searchText: '',
      showInfo: false,
      yearString: `${moment().year()}`
    }
  },

  mounted() {
    this.loadRoute()
  },

  computed: {
    ...mapGetters([
      'currentEpisode',
      'currentProduction',
      'productionShotTaskTypes',
      'getProductionTaskStatuses',
      'shotTaskTypes',
      'personMap'
    ]),

    yearOptions() {
      const year = 2018
      const currentYear = moment().year()
      return range(year, currentYear).map(year => ({
        label: year,
        value: `${year}`
      }))
    },

    monthOptions() {
      const currentYear = `${moment().year()}`
      const month = 1
      const currentMonth = moment().month() + 1
      let monthRange = range(month, 12)
      if (currentYear === this.yearString) {
        monthRange = range(month, currentMonth)
      }
      return monthRange.map(month => ({
        label: monthToString(month),
        value: `${month}`
      }))
    },

    taskStatuses() {
      return this.getProductionTaskStatuses(this.currentProduction.id).filter(
        status => !status.for_concept
      )
    }
  },

  methods: {
    ...mapActions(['getPersonQuotaShots', 'loadShots']),

    getCurrentPerson() {
      const personId = this.$route.params.person_id
      if (personId && this.personMap) {
        return this.personMap.get(personId)
      } else {
        return {}
      }
    },

    loadRoute() {
      const { month, year, week, day } = this.$route.params
      const { countMode, taskTypeId, taskStatusIds, userMode } =
        this.$route.query

      if (this.$route.path.indexOf('week') > 0) this.detailLevel = 'week'
      if (this.$route.path.indexOf('month') > 0) this.detailLevel = 'month'
      if (this.$route.path.indexOf('day') > 0) this.detailLevel = 'day'

      this.currentPerson = this.getCurrentPerson()
      this.detailLevelString = this.detailLevel
      if (countMode) {
        this.countMode = countMode
        this.currentMode = this.countMode
      }
      if (taskTypeId) {
        this.taskTypeId = taskTypeId
      } else {
        const key = `status-stats:${this.currentProduction.id}:task-type-id`
        this.taskTypeId = localStorage.getItem(key) || this.shotTaskTypes[0].id
      }
      if (taskStatusIds) {
        this.taskStatusIds = taskStatusIds
      } else {
        const key = `quota:${this.currentProduction.id}:task-status-ids`
        let status_ids = localStorage.getItem(key) || []
        // if its a string, convert to array
        if (status_ids === 'string') {
          status_ids = [status_ids]
        }
        this.taskStatusIds = status_ids
      }

      if (userMode) {
        this.userMode = userMode
      }
      if (month) {
        this.currentMonth = Number(month)
        this.monthString = `${month}`
      }
      if (year) {
        this.currentYear = Number(year)
        this.yearString = `${year}`
      }
      if (week) {
        this.currentWeek = Number(week)
        this.weekString = `${week}`
      }
      if (day) {
        this.currentDay = Number(day)
      }

      if (this.$route.path.indexOf('person') > 0) {
        this.isPersonShotsLoading = true
        this.getPersonQuotaShots({
          personId: this.currentPerson.id,
          detailLevel: this.detailLevel,
          taskTypeId: this.taskTypeId,
          year,
          month,
          week,
          day,
          userMode: this.userMode
        }).then(shots => {
          this.isPersonShotsLoading = false
          this.personShots = shots
          this.showSideInfo()
        })
      } else {
        this.hideSideInfo()
      }
    },

    showSideInfo() {
      this.showInfo = true
    },

    hideSideInfo() {
      this.showInfo = false
    },

    episodifyRoute(route) {
      if (this.currentEpisode) {
        episodifyRoute(route, this.currentEpisode.id)
      }
      return route
    },

    exportQuotas() {
      const quotas = this.$refs['quota-list'].quotaMap

      const nameData = ['quotas', this.detailLevel, this.currentYear]
      if (this.detailLevel === 'day') nameData.push(this.currentMonth)
      const name = stringHelpers.slugify(nameData.join('_'))
      const people = Object.keys(quotas)
        .map(personId => this.personMap.get(personId))
        .sort((a, b) =>
          a.full_name.localeCompare(b.full_name, undefined, {
            numeric: true
          })
        )
      csv.generateQuotas(
        name,
        quotas,
        people,
        this.countMode,
        this.detailLevel,
        moment().year(),
        moment().month() + 1,
        this.currentYear,
        this.currentMonth,
        this.currentWeek
      )
    },

    resetRouteQuery() {
      this.$router.push({
        query: {
          countMode: this.countMode,
          userMode: this.userMode,
          taskTypeId: this.taskTypeId,
          taskStatusIds: this.taskStatusIds
        }
      })
    },

    onSearchChange(searchText) {
      this.searchText = searchText
    }
  },

  watch: {
    detailLevelString() {
      if (this.detailLevel !== this.detailLevelString) {
        const route = {
          name: `quota-${this.detailLevelString}`,
          params: {
            year: this.currentYear
          },
          query: {
            countMode: this.countMode,
            userMode: this.userMode
          }
        }
        if (this.detailLevelString === 'day') {
          route.params.month = this.currentMonth
        }
        this.$router.push(this.episodifyRoute(route))
      }
    },

    yearString() {
      const year = Number(this.yearString)
      const currentMonth = moment().month() + 1
      if (this.currentYear !== year) {
        const route = {
          name: `quota-${this.detailLevelString}`,
          params: {
            year: year
          },
          query: {
            countMode: this.countMode,
            userMode: this.userMode
          }
        }
        if (this.detailLevelString === 'day') {
          route.params.month = `${Math.min(
            Number(this.monthString),
            currentMonth
          )}`
        }
        this.$router.push(this.episodifyRoute(route))
      }
    },

    monthString() {
      if (this.currentMonth !== Number(this.monthString)) {
        const route = {
          name: 'quota-day',
          params: {
            year: this.currentYear,
            month: Number(this.monthString)
          },
          query: {
            countMode: this.countMode,
            userMode: this.userMode,
            taskTypeId: this.taskTypeId
          }
        }
        this.$router.push(this.episodifyRoute(route))
      }
    },

    countMode() {
      if (this.currentMode !== this.countMode) {
        if (this.$route.query.countMode !== this.countMode) {
          this.resetRouteQuery()
          this.currentMode = this.countMode
        }
      }
    },

    userMode() {
      if (this.$route.query.userMode !== this.userMode) {
        this.resetRouteQuery()
        this.currentPerson = null
      }
    },

    taskTypeId() {
      const key = `status-stat:${this.currentProduction.id}:task-type-id`
      localStorage.setItem(key, this.taskTypeId)
      if (this.$route.query.taskTypeId !== this.taskTypeId) {
        this.resetRouteQuery()
      }
    },
    taskStatusIds() {
      console.log('taskStatusIds', this.taskStatusIds)
      const key = `status-stat:${this.currentProduction.id}:task-status-ids`
      localStorage.setItem(key, this.taskStatusIds)
      if (this.$route.query.taskStatusIds !== this.taskStatusIds) {
        this.resetRouteQuery()
      }
    },

    currentProduction() {
      this.isLoading = true
      this.loadShots(() => {
        this.loadRoute()
        this.isLoading = false
      })
    },

    currentEpisode() {
      this.isLoading = true
      this.loadShots(() => {
        this.loadRoute()
        this.isLoading = false
      })
    },

    $route() {
      this.loadRoute()
    }
  },

  head() {
    const prodName = this.currentProduction.name
    return {
      title: `${prodName} | ${this.$t('status-stats.title')} - Kitsu`
    }
  }
}
</script>

<style lang="scss" scoped>
.dark {
  .filters {
    color: $white-grey;
  }
}

.filters {
  padding-bottom: 2rem;

  .field {
    padding-bottom: 0;
    margin-bottom: 0;
  }

  .overall-man-days {
    width: 120px;
    font-size: 0.9em;
    margin-right: 1em;
  }
}

.fixed-page {
  padding-top: 60px;
  padding-left: 2em;
}

.main-column {
  border: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  padding-top: 2em;
  padding-right: 2em;
}

.zoom-level {
  margin-top: -10px;
}

.side-column {
  border-left: 1px solid var(--border);
  padding: 0;
  margin: 0;
}

.search-field {
  color: var(--text);
}

.label {
  font-weight: 300;
  color: var(--text);
}

.max-quota-input {
  width: 80px;
}
</style>
