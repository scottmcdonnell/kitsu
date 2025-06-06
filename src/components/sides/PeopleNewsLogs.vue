<template>
  <div class="side side-column">
    <div class="page-header flexrow">
      <div class="flexcolumn-item">
        <div class="flexrow">
          <people-avatar class="flexrow-item" :person="person" :size="40" />
          <div class="person-info flexcolumn-item">
            <h2 class="subtitle flexrow-item">{{ person.full_name }}</h2>
          </div>
        </div>
      </div>
      <button class="close-button" @click="$emit('close')">
        <x-icon />
      </button>
    </div>

    <div class="flexcolumn-item">
      <div class="news-logs">
        <div class="has-text-centered mt2" v-if="isLoading">
          <spinner />
        </div>

        <div
          class="has-text-centered empty-list"
          v-if="!isLoading && newsLogs.length === 0"
        >
          <p class="info">{{ $t('news.no_news') }}</p>
        </div>

        <div class="news-log-list" v-if="!isLoading && newsLogs.length > 0">
          <div
            class="news-log-entry"
            :key="'news-' + newsLog.id"
            v-for="newsLog in sortedNewsLogs"
            @click="openNewsDetail(newsLog)"
          >
            <div class="flexrow news-log-header">
              <div class="flexrow-item news-date">
                {{ formatTime(newsLog.created_at) }}
              </div>
              <div class="flexrow-item">
                <validation-tag
                  :task="buildTaskFromNews(newsLog)"
                  :is-static="true"
                  :thin="!newsLog.change"
                />
              </div>
            </div>

            <div class="flexrow news-log-content">
              <entity-thumbnail
                class="flexrow-item entity-thumbnail"
                :entity="{
                  id: newsLog.task_entity_id,
                  preview_file_id: newsLog.entity_preview_file_id
                }"
                :with-link="false"
              />
              <div class="flexcolumn-item entity-info">
                <div class="entity-name">{{ newsLog.full_entity_name }}</div>
                <div class="task-type">
                  <task-type-name
                    :task-type="buildTaskTypeFromNews(newsLog)"
                    :production-id="newsLog.project_id"
                    :is-static="true"
                  />
                </div>
              </div>
            </div>

            <div class="news-comment" v-if="newsLog.comment_text">
              {{ truncateComment(newsLog.comment_text) }}
            </div>

            <div class="news-value" v-if="countMode !== 'count'">
              <strong>{{ getCountModeLabel() }}:</strong>
              {{ getNewsValue(newsLog) }}
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import moment from 'moment-timezone'
import { mapGetters } from 'vuex'
import { XIcon } from 'lucide-vue-next'

import PeopleAvatar from '@/components/widgets/PeopleAvatar.vue'
import EntityThumbnail from '@/components/widgets/EntityThumbnail.vue'
import TaskTypeName from '@/components/widgets/TaskTypeName.vue'
import ValidationTag from '@/components/widgets/ValidationTag.vue'
import Spinner from '@/components/widgets/Spinner.vue'

export default {
  name: 'people-news-logs',

  emits: ['close'],

  components: {
    PeopleAvatar,
    EntityThumbnail,
    TaskTypeName,
    ValidationTag,
    Spinner,
    XIcon
  },

  props: {
    person: {
      type: Object,
      required: true
    },
    newsLogs: {
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
      default: 'count'
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
    }
  },

  computed: {
    ...mapGetters(['taskStatusMap', 'taskTypeMap', 'timezone']),

    sortedNewsLogs() {
      return [...this.newsLogs].sort((a, b) => {
        return new Date(b.created_at) - new Date(a.created_at)
      })
    }
  },

  methods: {
    formatTime(date) {
      const utcDate = moment.tz(date, 'UTC').tz(this.timezone)
      return utcDate.format('MMM DD, HH:mm')
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
          return news.nb_frames || 0
        case 'nb_seconds':
          return news.nb_seconds || 0
        case 'nb_drawings':
          return news.nb_drawings || 0
        default:
          return 1
      }
    },

    getCountModeLabel() {
      switch (this.countMode) {
        case 'nb_frames':
          return this.$t('status-stats.frames')
        case 'nb_seconds':
          return this.$t('status-stats.seconds')
        case 'nb_drawings':
          return this.$t('status-stats.drawings')
        default:
          return this.$t('status-stats.count')
      }
    },

    truncateComment(text) {
      if (!text) return ''
      return text.length > 150 ? text.substring(0, 150) + '...' : text
    },

    openNewsDetail(newsLog) {
      // Navigate to news feed with this specific news item highlighted
      const route = {
        name: 'news-feed',
        query: {
          person_id: this.person.id,
          news_id: newsLog.id
        }
      }
      this.$router.push(route)
    }
  }
}
</script>

<style lang="scss" scoped>
.side {
  background: var(--background);
  height: 100%;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.page-header {
  padding: 1rem;
  border-bottom: 1px solid var(--border);
  background: var(--background-header);
  align-items: center;
}

.person-info {
  margin-left: 1rem;
}

.subtitle {
  margin: 0;
  color: var(--text);
}

.close-button {
  background: none;
  border: none;
  cursor: pointer;
  padding: 0.5rem;
  color: var(--text);

  &:hover {
    color: var(--text-strong);
  }
}

.news-logs {
  flex: 1;
  overflow-y: auto;
  padding: 1rem;
}

.empty-list {
  padding: 2rem;
  text-align: center;
}

.info {
  color: var(--text-light);
}

.news-log-list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.news-log-entry {
  background: var(--background-alt);
  border: 1px solid var(--border);
  border-radius: 0.5rem;
  padding: 1rem;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background: var(--background-hover);
    border-color: var(--border-strong);
  }
}

.news-log-header {
  margin-bottom: 0.5rem;
  align-items: center;
}

.news-date {
  font-size: 0.9rem;
  color: var(--text-light);
  font-weight: 500;
}

.news-log-content {
  margin-bottom: 0.5rem;
  align-items: center;
}

.entity-thumbnail {
  margin-right: 0.75rem;
}

.entity-info {
  flex: 1;
}

.entity-name {
  font-weight: 500;
  color: var(--text-strong);
  margin-bottom: 0.25rem;
}

.task-type {
  font-size: 0.9rem;
}

.news-comment {
  background: var(--background);
  border: 1px solid var(--border-alt);
  border-radius: 0.25rem;
  padding: 0.5rem;
  margin-bottom: 0.5rem;
  font-size: 0.9rem;
  color: var(--text);
  line-height: 1.4;
}

.news-value {
  font-size: 0.9rem;
  color: var(--text-light);
}
</style>
