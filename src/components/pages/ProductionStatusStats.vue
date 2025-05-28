<template>
  <div class="columns fixed-page">
    <div class="column main-column">
      <route-tabs :active-tab="activeTab" :tabs="tabs" />

      <div class="flexrow filters">
        <div class="flexrow-item" v-if="activeTab === 'tasktypes'">
          <combobox-task-type
            class="flexrow-item"
            :label="$t('status-stats.type_label')"
            :task-type-list="taskTypeList"
            :disabled="!params.person"
            v-model="params.taskTypeId"
          />
        </div>
        <people-field
          ref="person-field"
          class="person-field flexrow-item"
          :clearable="false"
          :disabled="isCurrentUserArtist"
          :label="$t('main.person')"
          :people="teamPersons"
          v-model="params.person"
          v-if="activeTab === 'persons'"
        />
        <combobox-statuses
          :production-id="currentProduction.id"
          :label="$t('status-stats.status_label')"
          :statuses="taskStatuses"
          :multiple="true"
          v-model="params.taskStatusIds"
        />
        <combobox
          class="flexrow-item"
          :label="$t('status-stats.detail_label')"
          :options="detailLevelOptions"
          v-model="detailLevelString"
        />
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
        <combobox
          class="flexrow-item"
          :label="$t('status-stats.count_label')"
          :options="countModeOptions"
          v-model="params.countMode"
        />
        <combobox
          class="flexrow-item"
          :label="$t('status-stats.user_mode')"
          :options="userModeOptions"
          v-model="params.userMode"
        />
        <info-question-mark
          class="mt2"
          :text="$t('status-stats.explanation_' + userMode)"
        />
        <div class="filler"></div>
        <button-simple
          class="flexrow-item"
          :title="$t('status-stats.export_stats')"
          icon="download"
          @click="exportStats"
        />
      </div>

      <div class="flexrow mb2 mt0">
        <search-field
          ref="search-field"
          class="search-field flexrow-item"
          @change="onSearchChange"
          v-if="activeTab === 'tasktypes'"
        />

        <span class="label flexrow-item">
          {{ $t('status-stats.highlight_stats') }}
        </span>

        <text-field
          class="flexrow-item max-stats-input"
          type="number"
          v-model="maxStats"
        />
      </div>

      <status-stats
        ref="status-stat-list"
        :task-type-id="activeTab === 'tasktypes' ? params.taskTypeId : null"
        :person-id="
          activeTab === 'persons' && params.person ? params.person.id : null
        "
        :task-status-ids="params.taskStatusIds"
        :detail-level="detailLevelString"
        :year="currentYear"
        :month="currentMonth"
        :week="currentWeek"
        :day="currentDay"
        :count-mode="params.countMode"
        :user-mode="params.userMode"
        :search-text="searchText"
        :max-stats="maxStats"
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
        :count-mode="params.countMode"
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

import { episodifyRoute } from '@/lib/path'
import preferences from '@/lib/preferences'
import { monthToString, range } from '@/lib/time'
import { sortPeople } from '@/lib/sorting'
import personStore from '@/store/modules/people'

import ButtonSimple from '@/components/widgets/ButtonSimple.vue'
import Combobox from '@/components/widgets/Combobox.vue'
import ComboboxStatuses from '@/components/widgets/ComboboxStatuses.vue'
import ComboboxTaskType from '@/components/widgets/ComboboxTaskType.vue'
import InfoQuestionMark from '@/components/widgets/InfoQuestionMark.vue'
import PeopleField from '@/components/widgets/PeopleField.vue'
import PeopleQuotaInfo from '@/components/sides/PeopleQuotaInfo.vue'
import StatusStats from '@/components/pages/status-stats/StatusStats.vue'
import RouteTabs from '@/components/widgets/RouteTabs.vue'
import SearchField from '@/components/widgets/SearchField.vue'
import TextField from '@/components/widgets/TextField.vue'
const personMap = personStore.cache.personMap
export default {
  name: 'production-status-stats',

  components: {
    ButtonSimple,
    Combobox,
    ComboboxStatuses,
    ComboboxTaskType,
    InfoQuestionMark,
    PeopleField,
    PeopleQuotaInfo,
    StatusStats,
    RouteTabs,
    SearchField,
    TextField
  },

  data() {
    return {
      activeTab: 'tasktypes',
      tabs: [
        { name: 'tasktypes', label: this.$t('task_types.title') },
        { name: 'persons', label: this.$t('main.people') }
      ],
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
      detailLevel: 'day',

      isLoading: false,
      isPersonShotsLoading: false,
      maxStats: 0,

      detailLevelString: 'day',
      monthString: `${moment().month() + 1}`,
      yearString: `${moment().year()}`,

      params: {
        countMode: 'frames',
        userMode: 'weighted',
        person: null,
        taskStatusIds: [],
        taskTypeId: ''
      },
      personShots: [],
      silent: false,

      searchText: '',
      showInfo: false
    }
  },

  mounted() {
    this.setCountModeOptions()
    const key = `status-stats:${this.currentProduction.id}:params`
    const savedParams = preferences.getObjectPreference(key) || {}
    const defaultParams = {
      countMode: this.countModeOptions[0].value,
      userMode: this.userModeOptions[0].value,
      taskTypeId: this.productionShotTaskTypes[0].id,
      taskStatusIds: []
    }
    this.activeTab = this.$route.query.tab || 'tasktypes'
    this.params = {
      countMode:
        this.$route.query.countMode ||
        savedParams.countMode ||
        defaultParams.countMode,
      userMode:
        this.$route.query.userMode ||
        savedParams.userMode ||
        defaultParams.userMode,
      taskTypeId: this.$route.query.taskTypeId,
      person: this.$route.query.personId
        ? personMap.get(this.$route.query.personId)
        : null,
      taskStatusIds:
        this.$route.query.taskStatusIds?.split(',') ||
        savedParams.taskStatusIds ||
        defaultParams.taskStatusIds
    }
    if (!this.params.taskTypeId && !this.params.person) {
      this.params.taskTypeId =
        savedParams.taskTypeId || defaultParams.taskTypeId
    }
    this.resetRouteQuery()
    this.loadRoute()
  },

  computed: {
    ...mapGetters([
      'currentEpisode',
      'currentProduction',
      'getProductionTaskStatuses',
      'isCurrentUserArtist',
      'isPaperProduction',
      'productionShotTaskTypes',
      'user'
    ]),
    taskTypeList() {
      return [...this.productionShotTaskTypes]
    },

    teamPersons() {
      if (this.isCurrentUserArtist) {
        return [personMap.get(this.user.id)]
      }
      return sortPeople(
        this.currentProduction.team.map(personId => personMap.get(personId))
      )
    },

    yearOptions() {
      const year = 2018
      const currentYear = moment().year()
      return range(year, currentYear)
        .map(year => ({
          label: year,
          value: `${year}`
        }))
        .reverse()
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
      return personMap?.get(personId) ?? {}
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
        this.currentMode = this.params.countMode
      }
      if (taskTypeId) {
        this.params.taskTypeId = taskTypeId
      }
      if (this.$route.query.personId) {
        this.params.person = personMap.get(this.$route.query.personId)
      }
      if (taskStatusIds) {
        this.params.taskStatusIds = taskStatusIds?.split(',')
      }
      if (userMode) {
        this.params.userMode = userMode
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
          taskTypeId: this.params.taskTypeId,
          year,
          month,
          week,
          day,
          userMode: this.params.userMode
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

    exportStats() {
      const quotas = this.$refs['quota-list'].quotaMap

      const nameData = ['quotas', this.detailLevel, this.currentYear]
      if (this.detailLevel === 'day') nameData.push(this.currentMonth)
      const name = stringHelpers.slugify(nameData.join('_'))
      const people = Object.keys(quotas)
        .map(personId => personMap.get(personId))
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

    onSearchChange(searchText) {
      this.searchText = searchText
    },

    setCountModeOptions() {
      if (this.isPaperProduction) {
        this.countModeOptions = [
          { label: this.$t('quota.drawings'), value: 'drawings' },
          { label: this.$t('quota.count'), value: 'count' }
        ]
        this.countMode = 'drawings'
        this.currentMode = this.params.countMode
      } else {
        this.countModeOptions = [
          { label: this.$t('quota.frames'), value: 'frames' },
          { label: this.$t('quota.seconds'), value: 'seconds' },
          { label: this.$t('quota.count'), value: 'count' }
        ]
        this.params.countMode = 'frames'
        this.currentMode = this.params.countMode
      }
    },

    resetRouteQuery() {
      const query = this.getQuery()
      const key = `status-stats:${this.currentProduction.id}:params`
      preferences.setObjectPreference(key, this.params)
      this.$router.push({ query })
    },

    getQuery() {
      const taskTypeId =
        this.activeTab === 'tasktypes' ? this.params.taskTypeId : undefined
      let personId = null
      const isPersonTab =
        this.activeTab === 'persons' || this.$route.query.tab === 'persons'
      if (isPersonTab && this.params.person) {
        personId = this.params.person.indexOf
      } else if (isPersonTab) {
        personId = this.teamPersons[0]?.id
      }

      const query = {
        countMode: this.params.countMode,
        userMode: this.params.userMode,
        taskStatusIds: this.params.taskStatusIds.join(','),
        tab: this.activeTab || 'tasktypes',
        taskTypeId,
        personId: personId || undefined
      }
      return query
    }
  },

  watch: {
    'params.person'() {
      if (!this.silent) {
        this.silent = true
        this.resetRouteQuery()
        setTimeout(() => {
          this.silent = false
        }, 100)
      }
    },
    detailLevelString() {
      if (this.detailLevel !== this.detailLevelString) {
        const route = {
          name: `quota-${this.detailLevelString}`,
          params: {
            year: this.currentYear
          },
          query: this.getQuery()
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
            year
          },
          query: this.getQuery()
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
            month: this.monthString
          },
          query: this.getQuery()
        }
        this.$router.push(this.episodifyRoute(route))
      }
    },

    'params.countMode'() {
      this.resetRouteQuery()
      this.currentMode = this.params.countMode
    },

    'params.userMode'() {
      if (this.$route.query.userMode !== this.params.userMode) {
        this.resetRouteQuery()
        this.currentPerson = null
      }
    },
    'params.taskTypeId'() {
      if (!this.silent && this.params.taskTypeId) {
        this.silent = true
        this.resetRouteQuery()
        setTimeout(() => {
          this.silent = false
        }, 100)
      }
    },

    'params.taskStatusIds'() {
      if (this.$route.query.taskStatusIds !== this.params.taskStatusIds) {
        this.silent = true
        this.resetRouteQuery()
        setTimeout(() => {
          this.silent = false
        }, 100)
      }
    },

    currentProduction() {
      this.setCountModeOptions()
      this.isLoading = true
      this.loadShots(() => {
        this.resetRouteQuery()
        this.loadRoute()
        this.isLoading = false
      })
    },

    currentEpisode() {
      this.isLoading = true
      this.loadShots(() => {
        this.resetRouteQuery()
        this.loadRoute()
        this.isLoading = false
      })
    },

    $route() {
      this.activeTab = this.$route.query.tab || 'tasktypes'
      this.resetRouteQuery()
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
