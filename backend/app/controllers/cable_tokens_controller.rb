class CableTokensController < ApplicationController
  def create
    render json: {
      status: "success",
      data: { token: CableUserToken.issue(current_auth_session) }
    }, status: :created
  end
end
