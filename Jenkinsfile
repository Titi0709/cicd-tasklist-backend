pipeline {
  agent any

  environment {
    DOCKER_IMAGE = 'thibaultlefay/tasklist-backend:latest'
  }

  stages {
    stage('Checkout') {
      steps {
        checkout scm
      }
    }

    stage('Install dependencies') {
      steps {
        sh 'npm ci'
      }
    }

    stage('Run unit tests') {
      steps {
        sh 'npm run test:coverage'
      }
      post {
        always {
          junit 'reports/junit.xml'
        }
      }
    }

    stage('Run E2E tests') {
      steps {
        sh 'npm run test:e2e:coverage || true'
      }
    }

    stage('Build application') {
      steps {
        sh 'npm run build'
      }
    }

    stage('Static analysis') {
      steps {
        withCredentials([
          string(credentialsId: 'sonar-backend-token', variable: 'SONAR_TOKEN')
        ]) {
          sh '''
            npx sonar-scanner \
              -Dsonar.projectKey=cicd-tasklist-backend \
              -Dsonar.projectName=cicd-tasklist-backend \
              -Dsonar.sources=src \
              -Dsonar.tests=src/__tests__ \
              -Dsonar.exclusions=src/__tests__/**,**/node_modules/**,**/dist/**,**/coverage/** \
              -Dsonar.host.url=http://localhost:9000 \
              -Dsonar.login=${SONAR_TOKEN} \
              -Dsonar.javascript.lcov.reportPaths=coverage/lcov.info || true
          '''
        }
      }
    }

    stage('Build Docker image') {
      steps {
        sh 'docker build -t ${DOCKER_IMAGE} .'
      }
    }

    stage('Security scan') {
      steps {
        sh 'trivy image --exit-code 0 --severity HIGH,CRITICAL ${DOCKER_IMAGE} || true'
      }
    }

    stage('Generate SBOM') {
      steps {
        sh 'trivy image --format spdx-json --output sbom-spdx.json ${DOCKER_IMAGE} || true'
      }
      post {
        always {
          archiveArtifacts artifacts: 'sbom-spdx.json', fingerprint: true, allowEmptyArchive: true
        }
      }
    }

    stage('Publish image') {
      steps {
        withCredentials([usernamePassword(credentialsId: 'dockerhub-credentials', usernameVariable: 'DOCKER_USER', passwordVariable: 'DOCKER_PASS')]) {
          sh '''
            echo "$DOCKER_PASS" | docker login -u "$DOCKER_USER" --password-stdin
            docker push ${DOCKER_IMAGE}
            docker logout
          '''
        }
      }
    }
  }

  post {
    always {
      archiveArtifacts artifacts: 'reports/junit.xml,coverage/**', allowEmptyArchive: true
    }
    success {
      echo ' Backend Pipeline completed successfully!'
    }
    failure {
      echo ' Backend Pipeline failed!'
    }
  }
}
