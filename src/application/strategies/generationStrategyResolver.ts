import type { DeliveryMethod } from '../../domain/models';
import type {
  IGenerationStrategy,
  IGenerationStrategyResolver,
} from '../../domain/ports/inference';

export class GenerationStrategyResolver implements IGenerationStrategyResolver {
  private readonly strategies: Readonly<Record<DeliveryMethod, IGenerationStrategy>>;

  constructor(strategies: Readonly<Record<DeliveryMethod, IGenerationStrategy>>) {
    this.strategies = strategies;
  }

  resolve(method: DeliveryMethod): IGenerationStrategy {
    return this.strategies[method] ?? this.strategies.sync;
  }
}
