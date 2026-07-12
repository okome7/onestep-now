class TasksController < ApplicationController
  before_action :require_current_user
  before_action :set_task, only: [ :start, :complete, :destroy ]

  def create
    task = current_user.tasks.create!(task_params.merge(status: :pending))
    render json: { status: "success", data: task_payload(task) }, status: :created
  rescue ActiveRecord::RecordInvalid => e
    render json: { status: "error", errors: e.record.errors.full_messages }, status: :unprocessable_entity
  end

  def start
    return render_forbidden unless owns_task?

    ActiveRecord::Base.transaction do
      current_user.tasks.active.where.not(id: @task.id).destroy_all
      @task.update!(status: :active, started_at: Time.current)
      @task.create_completion_post!(
        user: current_user,
        status: :doing,
        content: @task.title
      ) unless @task.completion_post
    end

    render json: { status: "success", data: task_payload(@task) }, status: :ok
  rescue ActiveRecord::RecordInvalid => e
    render json: { status: "error", errors: e.record.errors.full_messages }, status: :unprocessable_entity
  end

  def complete
    return render_forbidden unless owns_task?

    completed_at = Time.current

    ActiveRecord::Base.transaction do
      @task.update!(status: :completed, completed_at: completed_at)
      post = @task.completion_post || @task.create_completion_post!(user: current_user, status: :doing, content: @task.title)
      post.update!(status: :completed, completed_at: completed_at)
      current_user.update!(feed_access_expires_at: 5.minutes.from_now)
    end

    render json: { status: "success", data: task_payload(@task.reload) }, status: :ok
  rescue ActiveRecord::RecordInvalid => e
    render json: { status: "error", errors: e.record.errors.full_messages }, status: :unprocessable_entity
  end

  def destroy
    return render_forbidden unless owns_task?

    if @task.completed?
      return render json: { status: "error", errors: [ "完了済みタスクは削除できません。" ] }, status: :unprocessable_entity
    end

    @task.destroy!
    render json: { status: "success" }, status: :ok
  end

  private

  def set_task
    @task = Task.find(params[:id])
  end

  def owns_task?
    @task.user_id == current_user.id
  end

  def task_params
    params.require(:task).permit(:title)
  end

  def task_payload(task)
    {
      id: task.id,
      title: task.title,
      status: task.status,
      started_at: task.started_at,
      completed_at: task.completed_at,
      completion_post_id: task.completion_post&.id,
      completion_post: completion_post_payload(task.completion_post)
    }
  end

  def completion_post_payload(post)
    return nil unless post

    {
      id: post.id,
      status: post.status,
      status_label: post.status_label,
      card_variant: post.card_variant,
      likes_count: post.completion_post_likes.size,
      comments_count: post.comments.size,
      liked_by_me: post.completion_post_likes.any? { |like| like.user_id == current_user.id },
      comments: post.comments.order(created_at: :asc).map { |comment| comment_payload(comment) },
      created_at: post.created_at,
      completed_at: post.completed_at
    }
  end

  def comment_payload(comment)
    {
      id: comment.id,
      user_id: comment.user_id,
      user_name: comment.user.name,
      avatar_key: comment.user.avatar_key,
      body: comment.body,
      post_status_when_commented: comment.post_status_when_commented,
      created_at: comment.created_at
    }
  end
end
